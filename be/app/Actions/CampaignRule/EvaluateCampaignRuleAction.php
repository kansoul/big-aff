<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Enums\RuleActionMode;
use App\Jobs\SendTelegramWarningJob;
use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignReport;
use App\Services\Integrations\Ads\AdsStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class EvaluateCampaignRuleAction
{
    public function __construct(
        private readonly AdsStatusService $adsStatusService,
    ) {}

    public function execute(Campaign $campaign, string $date): void
    {
        $metrics = $this->loadMetrics($campaign, $date);

        if ($metrics === null) {
            return;
        }

        $now = Carbon::now();

        $rules = DB::table('campaign_rules')
            ->select(
                'campaign_rules.*',
                'user_campaign_rule_settings.action_mode as setting_action_mode',
                'user_campaign_rule_settings.telegram_chat_id as setting_telegram_chat_id',
            )
            ->join('campaign_apply_rules', 'campaign_rules.id', '=', 'campaign_apply_rules.campaign_rule_id')
            ->join('users', 'campaign_rules.user_id', '=', 'users.id')
            ->leftJoin('user_campaign_rule_settings', 'users.id', '=', 'user_campaign_rule_settings.user_id')
            ->where('campaign_apply_rules.sourceable_type', Campaign::class)
            ->where('campaign_apply_rules.sourceable_id', (int) $campaign->campaign_id)
            ->where('campaign_rules.entity_type', EntityTypeEnum::Campaign->value)
            ->where('campaign_rules.is_active', true)
            ->where(function ($q) {
                $q->where('user_campaign_rule_settings.campaign_rule_auto_enabled', true)
                    ->orWhereNull('user_campaign_rule_settings.campaign_rule_auto_enabled');
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('campaign_rules.expired_at')
                    ->orWhereDate('campaign_rules.expired_at', '>=', $now->toDateString());
            })
            ->get();

        if ($rules->isEmpty()) {
            return;
        }

        $spend = $metrics['spend'];
        $revenue = $metrics['revenue'];
        $profit = $metrics['profit'];
        $roi = $metrics['roi'];

        foreach ($rules as $rule) {
            if ($spend < (float) ($rule->min_spend ?? 0)) {
                continue;
            }

            if ($revenue < (float) ($rule->min_revenue ?? 0)) {
                continue;
            }

            if (! $this->isWithinTimeWindow($rule, $now)) {
                continue;
            }

            $profitTriggered = $rule->min_profit !== null && $profit < (float) $rule->min_profit;
            $roiTriggered = $rule->min_roi !== null && $roi < (float) $rule->min_roi;

            if (! $profitTriggered && ! $roiTriggered) {
                continue;
            }

            $actionMode = $rule->setting_action_mode
                ? RuleActionMode::from($rule->setting_action_mode)
                : RuleActionMode::PAUSE;

            $telegramChatId = $rule->setting_telegram_chat_id ?? null;

            if ($actionMode === RuleActionMode::WARNING) {
                $this->sendNotification($rule, $campaign, $metrics, $telegramChatId, '🐧 *Campaign lỏ cần xem lại*');

                // WARNING: notify only, do NOT delete apply rule
                continue;
            }

            // PAUSE: call API first, then update DB
            Log::channel('rule_tracking')->info('[AutoOffCampaign] Rule triggered — attempting to auto-off campaign', [
                'campaign_id' => $campaign->campaign_id,
                'campaign_name' => $campaign->campaign_name,
                'rule_id' => $rule->id,
                'profit_triggered' => $profitTriggered,
                'roi_triggered' => $roiTriggered,
                'metrics' => $metrics,
                'telegram_chat_id' => $telegramChatId ?? '(fallback to global config)',
            ]);

            try {
                $success = $this->adsStatusService->updateCampaignStatus(
                    (string) $campaign->campaign_id,
                    'PAUSED',
                    true,
                );

                if (! $success) {
                    Log::channel('rule_tracking')->warning('[AutoOffCampaign] Pause API failed — campaign NOT turned off, no notification sent', [
                        'rule_id' => $rule->id,
                        'campaign_id' => $campaign->campaign_id,
                    ]);

                    break;
                }

                Log::channel('rule_tracking')->info('[AutoOffCampaign] Pause API success — updating DB & dispatching Telegram notification', [
                    'rule_id' => $rule->id,
                    'campaign_id' => $campaign->campaign_id,
                ]);

                DB::transaction(function () use ($campaign, $rule, $metrics, $telegramChatId) {
                    $campaign->update(['status' => 'PAUSED']);

                    $deleted = CampaignApplyRule::query()
                        ->where('sourceable_type', Campaign::class)
                        ->where('sourceable_id', (int) $campaign->campaign_id)
                        ->where('campaign_rule_id', $rule->id)
                        ->delete();

                    $this->sendNotification($rule, $campaign, $metrics, $telegramChatId, '🐧 *Camp lỏ đã tắt*');

                    Log::channel('rule_tracking')->info('[AutoOffCampaign] Campaign turned off & Telegram notification dispatched', [
                        'rule_id' => $rule->id,
                        'campaign_id' => $campaign->campaign_id,
                        'apply_rules_deleted' => $deleted,
                        'telegram_chat_id' => $telegramChatId ?? '(fallback to global config)',
                    ]);
                });
            } catch (Throwable $e) {
                Log::channel('rule_tracking')->error('[AutoOffCampaign] Pause error', [
                    'rule_id' => $rule->id,
                    'campaign_id' => $campaign->campaign_id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Stop after first pause rule fires
            break;
        }
    }

    /**
     * @return array{spend: float, revenue: float, profit: float, roi: float}|null
     */
    private function loadMetrics(Campaign $campaign, string $date): ?array
    {
        $report = CampaignReport::query()
            ->with('realtimeReport')
            ->where('campaign_id', $campaign->campaign_id)
            ->whereDate('date_start', $date)
            ->first();

        if (! $report) {
            return null;
        }

        $spend = (float) ($report->a_spend ?? 0);

        $rpc = (float) ($report->r_rpc ?? 0);

        $realtimeClicks = (int) ($report->realtimeReport?->click_ad_count ?? 0);
        $revenue = $realtimeClicks * $rpc;
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0.0;

        return compact('spend', 'revenue', 'profit', 'roi');
    }

    private function isWithinTimeWindow(object $rule, Carbon $now): bool
    {
        $start = $rule->start_hour ?? null;
        $end = $rule->end_hour ?? null;

        if (! $start && ! $end) {
            return true;
        }

        $current = $now->format('H:i');
        $start ??= '00:00';
        $end ??= '23:59';

        return $start <= $end
            ? $current >= $start && $current <= $end
            : $current >= $start || $current <= $end; // Overnight window
    }

    /**
     * @param  array{spend: float, revenue: float, profit: float, roi: float}  $metrics
     */
    private function sendNotification(
        object $rule,
        Campaign $campaign,
        array $metrics,
        ?string $telegramChatId,
        string $title,
    ): void {
        try {
            $spend = number_format($metrics['spend'] ?? 0, 2);
            $revenue = number_format($metrics['revenue'] ?? 0, 2);
            $profit = number_format($metrics['profit'] ?? 0, 2);
            $roi = number_format($metrics['roi'] ?? 0, 2);

            $pad = 10;
            $message = "{$title}\n\n";
            $message .= 'Time: '.now()->format('d/m/Y H:i:s')."\n";
            $message .= 'Rule: '.$this->escapeMarkdown((string) $rule->title)."\n";
            $message .= "Campaign ID: {$campaign->campaign_id}\n";
            if ($campaign->campaign_name) {
                $campaignName = $this->escapeMarkdown((string) $campaign->campaign_name);
                $message .= "Campaign Name: {$campaignName}\n";
            }
            $message .= "================\n\n";
            $message .= "*Metrics:*\n";
            $message .= "```\n";
            $message .= str_pad('Metric', $pad).str_pad('Current', $pad)."Rule\n";

            $getOp = fn ($current, $ruleVal) => match (true) {
                (float) str_replace(',', '', $current) > (float) $ruleVal => '>',
                (float) str_replace(',', '', $current) < (float) $ruleVal => '<',
                default => '=',
            };

            $ruleRoi = $rule->min_roi ? " {$getOp($roi, $rule->min_roi)} {$rule->min_roi}%" : '-';
            $message .= str_pad('ROI', $pad).str_pad($roi.'%', $pad).$ruleRoi."\n";

            $ruleProfit = $rule->min_profit ? " {$getOp($profit, $rule->min_profit)} \${$rule->min_profit}" : '-';
            $message .= str_pad('Profit', $pad).str_pad('$'.$profit, $pad).$ruleProfit."\n";

            $ruleSpend = $rule->min_spend ? " {$getOp($spend, $rule->min_spend)} \${$rule->min_spend}" : '-';
            $message .= str_pad('Spend', $pad).str_pad('$'.$spend, $pad).$ruleSpend."\n";

            $ruleRev = $rule->min_revenue ? " {$getOp($revenue, $rule->min_revenue)} \${$rule->min_revenue}" : '-';
            $message .= str_pad('Revenue', $pad).str_pad('$'.$revenue, $pad).$ruleRev."\n";
            $message .= "```\n";
            Log::channel('rule_tracking')->info('[EvaluateCampaignRuleAction] Sending notification', [
                'rule_id' => $rule->id,
                'campaign_id' => $campaign->campaign_id,
                'telegram_chat_id' => $telegramChatId ?? '(fallback to global config)',
            ]);

            SendTelegramWarningJob::dispatch(
                $message,
                (string) $campaign->campaign_id,
                '',
                $telegramChatId,
                'Markdown',
            );
        } catch (Throwable $e) {
            Log::channel('rule_tracking')->error('[EvaluateCampaignRuleAction] Notification error', [
                'rule_id' => $rule->id,
                'campaign_id' => $campaign->campaign_id,
                'telegram_chat_id' => $telegramChatId ?? '(fallback to global config)',
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function escapeMarkdown(string $text): string
    {
        return str_replace(['_', '*', '`', '['], ['\_', '\*', '\`', '\['], $text);
    }
}

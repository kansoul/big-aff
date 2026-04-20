<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Enums\RuleActionMode;
use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class EvaluateCampaignRuleAction
{
    /**
     * @param  array{spend: float, revenue: float, profit: float, roi: float}  $metrics
     */
    public function execute(Campaign $campaign, array $metrics): void
    {
        $now = Carbon::now();

        // Single JOIN query — mirrors tracking-afs CampaignRuleService pattern.
        // Returns stdClass rows with rule fields + joined setting fields.
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
            ->where('campaign_apply_rules.sourceable_id', $campaign->id)
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

        $spend = (float) ($metrics['spend'] ?? 0);
        $revenue = (float) ($metrics['revenue'] ?? 0);
        $profit = (float) ($metrics['profit'] ?? 0);
        $roi = (float) ($metrics['roi'] ?? 0);

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

            // PAUSE: update status, delete apply rule, notify
            try {
                DB::transaction(function () use ($campaign, $rule, $metrics, $telegramChatId) {
                    $campaign->update(['status' => 'PAUSED']);

                    CampaignApplyRule::query()
                        ->where('sourceable_type', Campaign::class)
                        ->where('sourceable_id', $campaign->id)
                        ->where('campaign_rule_id', $rule->id)
                        ->delete();

                    $this->sendNotification($rule, $campaign, $metrics, $telegramChatId, '🐧 *Camp lỏ đã tắt*');
                });
            } catch (Throwable $e) {
                Log::channel('tracking_events')->error('[EvaluateCampaignRuleAction] Pause error', [
                    'rule_id' => $rule->id,
                    'campaign_id' => $campaign->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Stop after first pause rule fires
            break;
        }
    }

    private function isWithinTimeWindow(object $rule, Carbon $now): bool
    {
        $start = $rule->start_hour ?? null;
        $end = $rule->end_hour ?? null;

        if (! $start || ! $end) {
            return true;
        }

        $currentTime = $now->format('H:i');

        if ($start <= $end) {
            return $currentTime >= $start && $currentTime <= $end;
        }

        // Overnight window (e.g. 22:00 → 06:00)
        return $currentTime >= $start || $currentTime <= $end;
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
            $message .= "Rule: {$rule->title}\n";
            $message .= "Campaign: {$campaign->campaign_name}\n";
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

            $this->sendTelegram($message, $telegramChatId);
        } catch (Throwable $e) {
            Log::channel('tracking_events')->error('[EvaluateCampaignRuleAction] Notification error', [
                'rule_id' => $rule->id,
                'campaign_id' => $campaign->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send a Telegram message, optionally to an override chat ID.
     * Falls back to the configured default chat when no override is provided.
     */
    private function sendTelegram(string $message, ?string $chatId): void
    {
        $botToken = config('services.telegram.bot_token');
        $resolvedChatId = $chatId ?: config('services.telegram.chat_id');

        if (empty($botToken) || empty($resolvedChatId)) {
            return;
        }

        Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $resolvedChatId,
            'text' => $message,
            'parse_mode' => 'Markdown',
        ]);
    }
}

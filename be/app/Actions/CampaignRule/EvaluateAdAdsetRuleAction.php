<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Enums\EventClickType;
use App\Enums\RuleActionMode;
use App\Jobs\SendTelegramWarningJob;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\CampaignApplyRule;
use App\Models\RevenueReport;
use App\Services\Integrations\Ads\AdsStatusService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class EvaluateAdAdsetRuleAction
{
    public function __construct(
        private readonly AdsStatusService $adsStatusService,
    ) {}

    /**
     * Evaluate and apply ad/adset rules for a single entity.
     *
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    public function execute(string $entityType, string $entityId, ?string $date = null): void
    {
        if (! in_array($entityType, [AdsInsightsReport::class, AdsetInsightsReport::class], true)) {
            return;
        }

        $now = Carbon::now();
        $date = $date ?? $now->toDateString();
        $report = $this->loadReport($entityType, $entityId, $date);

        if (! $report) {
            return;
        }

        $spend = (float) ($report->spend ?? 0);
        $rpc = $this->loadRpc((string) $report->campaign_id, $date);
        $realtimeClicks = $this->computeRealtimeClicks($entityType, $entityId, $date);
        $revenue = $realtimeClicks * $rpc;
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0.0;
        $fbSourceableId = $this->numericSourceableId($report, $entityType);

        $rules = $this->getActiveRules($entityType, $fbSourceableId, $now);

        if ($rules->isEmpty()) {
            return;
        }

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

            $metrics = compact('spend', 'revenue', 'profit', 'roi');

            if ($actionMode === RuleActionMode::WARNING) {
                $this->sendNotification(
                    $rule,
                    $report,
                    $entityType,
                    $metrics,
                    $telegramChatId,
                    isPaused: false,
                );

                continue;
            }

            $this->pauseAndNotify(
                $rule,
                $report,
                $entityType,
                $fbSourceableId,
                $metrics,
                $telegramChatId,
            );

            break;
        }
    }

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function loadReport(string $entityType, string $entityId, string $date): ?Model
    {
        if ($entityType === AdsInsightsReport::class) {
            return AdsInsightsReport::query()
                ->where('ad_id', $entityId)
                ->whereDate('date_start', $date)
                ->first();
        }

        return AdsetInsightsReport::query()
            ->where('adset_id', $entityId)
            ->whereDate('date_start', $date)
            ->first();
    }

    private function loadRpc(string $campaignId, string $date): float
    {
        return (float) RevenueReport::query()
            ->where('campaign_id', $campaignId)
            ->whereDate('created_at', $date)
            ->average('revenue');
    }

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function computeRealtimeClicks(string $entityType, string $entityId, string $date): int
    {
        $column = $entityType === AdsInsightsReport::class ? 'ad_id' : 'adset_id';

        $dayStart = Carbon::parse($date)->startOfDay();
        $dayEnd = $dayStart->copy()->addDay();

        return (int) DB::table('event_clicks')
            ->where($column, $entityId)
            ->where('type', EventClickType::SubmitForm->value)
            ->where('created_at', '>=', $dayStart)
            ->where('created_at', '<', $dayEnd)
            ->count();
    }

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function numericSourceableId(Model $report, string $entityType): int
    {
        $raw = $entityType === AdsInsightsReport::class
            ? (string) $report->ad_id
            : (string) $report->adset_id;

        return (int) $raw;
    }

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function getActiveRules(string $entityType, int $fbSourceableId, Carbon $now): Collection
    {
        return DB::table('campaign_rules')
            ->select(
                'campaign_rules.*',
                'user_campaign_rule_settings.action_mode as setting_action_mode',
                'user_campaign_rule_settings.telegram_chat_id as setting_telegram_chat_id',
            )
            ->join('campaign_apply_rules', 'campaign_rules.id', '=', 'campaign_apply_rules.campaign_rule_id')
            ->join('users', 'campaign_rules.user_id', '=', 'users.id')
            ->leftJoin('user_campaign_rule_settings', 'users.id', '=', 'user_campaign_rule_settings.user_id')
            ->where('campaign_apply_rules.sourceable_type', $entityType)
            ->where('campaign_apply_rules.sourceable_id', $fbSourceableId)
            ->where('campaign_rules.entity_type', EntityTypeEnum::AdAdset->value)
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
     * @param  AdsInsightsReport|AdsetInsightsReport  $report
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     * @param  array{spend: float, revenue: float, profit: float, roi: float}  $metrics
     */
    private function pauseAndNotify(
        object $rule,
        Model $report,
        string $entityType,
        int $fbSourceableId,
        array $metrics,
        ?string $telegramChatId,
    ): void {
        try {
            $isAd = $entityType === AdsInsightsReport::class;

            $success = $isAd
                ? $this->adsStatusService->updateAdStatus($report->ad_id, 'PAUSED')
                : $this->adsStatusService->updateAdsetStatus($report->adset_id, 'PAUSED');

            if (! $success) {
                return;
            }

            DB::transaction(function () use ($report, $rule, $entityType, $fbSourceableId, $metrics, $telegramChatId): void {
                $report->update(['status' => 'PAUSED']);

                CampaignApplyRule::query()
                    ->where('sourceable_type', $entityType)
                    ->where('sourceable_id', $fbSourceableId)
                    ->where('campaign_rule_id', $rule->id)
                    ->delete();

                $this->sendNotification($rule, $report, $entityType, $metrics, $telegramChatId, isPaused: true);
            });
        } catch (Throwable $e) {
            Log::channel('tracking_events')->error('[EvaluateAdAdsetRuleAction] Pause error', [
                'rule_id' => $rule->id,
                'entity_type' => $entityType,
                'entity_id' => $fbSourceableId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     * @param  array{spend: float, revenue: float, profit: float, roi: float}  $metrics
     */
    private function sendNotification(
        object $rule,
        Model $report,
        string $entityType,
        array $metrics,
        ?string $telegramChatId,
        bool $isPaused,
    ): void {
        try {
            $isAd = $entityType === AdsInsightsReport::class;
            $prefix = $isAd ? 'Ad' : 'Adset';
            $entityName = $isAd ? ($report->ad_name ?? null) : ($report->adset_name ?? null);
            $entityFbId = $isAd ? $report->ad_id : $report->adset_id;

            $title = $isPaused
                ? "🐧 *{$prefix} lỏ đã tắt*"
                : "🐧 *{$prefix} lỏ cần xem lại*";

            $spend = number_format($metrics['spend'], 2);
            $revenue = number_format($metrics['revenue'], 2);
            $profit = number_format($metrics['profit'], 2);
            $roi = number_format($metrics['roi'], 2);

            $pad = 10;
            $message = "{$title}\n\n";
            $message .= 'Time: '.now()->format('d/m/Y H:i:s')."\n";
            $message .= 'Rule: '.$this->escapeMarkdown((string) $rule->title)."\n";
            $message .= "{$prefix} ID: {$entityFbId}\n";

            if ($entityName) {
                $safeName = $this->escapeMarkdown((string) $entityName);
                $message .= "{$prefix} Name: {$safeName}\n";
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

            SendTelegramWarningJob::dispatch(
                $message,
                (string) $entityFbId,
                '',
                $telegramChatId,
                'Markdown',
            );
        } catch (Throwable $e) {
            Log::channel('tracking_events')->error('[EvaluateAdAdsetRuleAction] Notification error', [
                'rule_id' => $rule->id,
                'entity_type' => $entityType,
                'entity_id' => $report->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function escapeMarkdown(string $text): string
    {
        return str_replace(['_', '*', '`', '['], ['\_', '\*', '\`', '\['], $text);
    }
}

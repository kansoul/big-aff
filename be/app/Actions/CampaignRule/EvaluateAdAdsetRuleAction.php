<?php

namespace App\Actions\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Enums\EventClickType;
use App\Enums\RuleActionMode;
use App\Jobs\SendTelegramWarningJob;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\CampaignApplyRule;
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
        $conversionRealtime = (int) ($this->computeConversionRealtime($entityType, $entityId, $date));
        $cpa = $conversionRealtime > 0 ? $spend / $conversionRealtime : 0.0;

        $fbSourceableId = $this->facebookNumericSourceableId($report, $entityType);

        $rules = $this->getActiveRules($entityType, $fbSourceableId, $now);

        if ($rules->isEmpty()) {
            return;
        }

        foreach ($rules as $rule) {
            if ($rule->min_conversion !== null && $conversionRealtime < (int) $rule->min_conversion) {
                continue;
            }

            if ($rule->min_spend_adset !== null && $spend < (float) $rule->min_spend_adset) {
                continue;
            }

            if (! $this->isWithinTimeWindow($rule, $now)) {
                continue;
            }

            $triggeredConditions = [];

            if ($rule->max_cpa !== null && $cpa >= (float) $rule->max_cpa) {
                $triggeredConditions[] = "CPA >= \${$rule->max_cpa}";
            }

            if (empty($triggeredConditions)) {
                continue;
            }

            $actionMode = $rule->setting_action_mode
                ? RuleActionMode::from($rule->setting_action_mode)
                : RuleActionMode::PAUSE;

            $telegramChatId = $rule->setting_telegram_chat_id ?? null;

            if ($actionMode === RuleActionMode::WARNING) {
                $this->sendNotification(
                    $rule,
                    $report,
                    $entityType,
                    $spend,
                    $cpa,
                    $conversionRealtime,
                    $triggeredConditions,
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
                $spend,
                $cpa,
                $conversionRealtime,
                $triggeredConditions,
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

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function computeConversionRealtime(string $entityType, string $entityId, string $date): int
    {
        $column = $entityType === AdsInsightsReport::class ? 'ad_id' : 'adset_id';

        return (int) DB::table('event_clicks')
            ->where($column, $entityId)
            ->where('type', EventClickType::ClickAd->value)
            ->whereRaw('DATE(created_at) = ?', [$date])
            ->count();
    }

    /**
     * Fetch active ad/adset rules applied to the given report row, joined with the
     * owner's per-user rule settings.
     *
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    private function facebookNumericSourceableId(Model $report, string $entityType): int
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

        if (! $start || ! $end) {
            return true;
        }

        $currentTime = $now->format('H:i');

        if ($start <= $end) {
            return $currentTime >= $start && $currentTime <= $end;
        }

        return $currentTime >= $start || $currentTime <= $end;
    }

    /**
     * @param  AdsInsightsReport|AdsetInsightsReport  $report
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     * @param  array<int, string>  $triggeredConditions
     */
    private function pauseAndNotify(
        object $rule,
        Model $report,
        string $entityType,
        int $fbSourceableId,
        float $spend,
        float $cpa,
        int $conversionRealtime,
        array $triggeredConditions,
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

            DB::transaction(function () use ($report, $rule, $entityType, $fbSourceableId): void {
                $report->update(['status' => 'PAUSED']);

                CampaignApplyRule::query()
                    ->where('sourceable_type', $entityType)
                    ->where('sourceable_id', $fbSourceableId)
                    ->where('campaign_rule_id', $rule->id)
                    ->delete();
            });

            $this->sendNotification(
                $rule,
                $report,
                $entityType,
                $spend,
                $cpa,
                $conversionRealtime,
                $triggeredConditions,
                $telegramChatId,
                isPaused: true,
            );
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
     * @param  array<int, string>  $triggeredConditions
     */
    private function sendNotification(
        object $rule,
        Model $report,
        string $entityType,
        float $spend,
        float $cpa,
        int $conversionRealtime,
        array $triggeredConditions,
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

            $pad = 18;
            $message = "{$title}\n\n";
            $message .= 'Time: '.now()->format('d/m/Y H:i:s')."\n";
            $message .= "Rule: {$rule->title}\n";
            $message .= "{$prefix} ID: {$entityFbId}\n";

            if ($entityName) {
                $safeName = str_replace('_', '\\_', (string) $entityName);
                $message .= "{$prefix} Name: {$safeName}\n";
            }

            $message .= "================\n\n";
            $message .= "*Metrics:*\n";
            $message .= "```\n";
            $message .= str_pad('Metric', $pad).str_pad('Current', $pad)."Rule\n";

            $message .= str_pad('CPA', $pad)
                .str_pad('$'.number_format($cpa, 2), $pad)
                .($rule->max_cpa !== null ? "(Max: \${$rule->max_cpa})" : '-')
                ."\n";

            $message .= str_pad('Spend', $pad)
                .str_pad('$'.number_format($spend, 2), $pad)
                .($rule->min_spend_adset !== null ? "(Min: \${$rule->min_spend_adset})" : '-')
                ."\n";

            $message .= str_pad('Conversion RT', $pad)
                .str_pad((string) $conversionRealtime, $pad)
                .($rule->min_conversion !== null ? "(Min: {$rule->min_conversion})" : '-')
                ."\n";

            $message .= "```\n";

            if (! empty($triggeredConditions)) {
                $message .= "\n*Triggered Conditions:*\n";
                foreach ($triggeredConditions as $condition) {
                    $message .= "• {$condition}\n";
                }
            }

            SendTelegramWarningJob::dispatch(
                $message,
                (string) $entityFbId,
                '',
                $telegramChatId,
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
}

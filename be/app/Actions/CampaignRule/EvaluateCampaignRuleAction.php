<?php

namespace App\Actions\CampaignRule;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\UserCampaignRuleSetting;
use App\Services\Integrations\Telegram\TelegramService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class EvaluateCampaignRuleAction
{
    public function __construct(
        protected TelegramService $telegramService,
    ) {}

    /**
     * @param  array<string, mixed>  $metrics  spend, revenue, profit, roi
     */
    public function execute(Campaign $campaign, array $metrics): void
    {
        $applyRules = CampaignApplyRule::query()
            ->where('sourceable_type', Campaign::class)
            ->where('sourceable_id', $campaign->id)
            ->with(['campaignRule.user.campaignRuleSetting'])
            ->get();

        if ($applyRules->isEmpty()) {
            return;
        }

        $now = Carbon::now();

        foreach ($applyRules as $applyRule) {
            $rule = $applyRule->campaignRule;

            if (! $rule || ! $rule->is_active) {
                continue;
            }

            if ($rule->expired_at && $rule->expired_at->isPast()) {
                continue;
            }

            /** @var UserCampaignRuleSetting|null $setting */
            $setting = $rule->user?->campaignRuleSetting;

            if ($setting && ! $setting->campaign_rule_auto_enabled) {
                continue;
            }

            if (! $this->isWithinTimeWindow($rule, $now)) {
                continue;
            }

            if (! $this->meetsPreConditions($rule, $metrics)) {
                continue;
            }

            if (! $this->isTriggered($rule, $metrics)) {
                continue;
            }

            $actionMode = $setting?->action_mode ?? $rule->user?->campaignRuleSetting?->action_mode;

            $this->sendNotification($rule, $setting, $campaign, $metrics);

            if ($actionMode?->value === 'pause') {
                $campaign->update(['status' => 'PAUSED']);
                $applyRule->delete();
            }
        }
    }

    private function isWithinTimeWindow(CampaignRule $rule, Carbon $now): bool
    {
        if (! $rule->start_hour || ! $rule->end_hour) {
            return true;
        }

        $start = Carbon::createFromTimeString($rule->start_hour);
        $end = Carbon::createFromTimeString($rule->end_hour);
        $current = Carbon::createFromTimeString($now->format('H:i'));

        if ($start <= $end) {
            return $current->between($start, $end);
        }

        // Overnight window
        return $current >= $start || $current <= $end;
    }

    /**
     * @param  array<string, mixed>  $metrics
     */
    private function meetsPreConditions(CampaignRule $rule, array $metrics): bool
    {
        if ($rule->min_spend !== null && (float) ($metrics['spend'] ?? 0) < (float) $rule->min_spend) {
            return false;
        }

        if ($rule->min_revenue !== null && (float) ($metrics['revenue'] ?? 0) < (float) $rule->min_revenue) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $metrics
     */
    private function isTriggered(CampaignRule $rule, array $metrics): bool
    {
        if ($rule->min_profit !== null && (float) ($metrics['profit'] ?? 0) < (float) $rule->min_profit) {
            return true;
        }

        if ($rule->min_roi !== null && (float) ($metrics['roi'] ?? 0) < (float) $rule->min_roi) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $metrics
     */
    private function sendNotification(
        CampaignRule $rule,
        ?UserCampaignRuleSetting $setting,
        Campaign $campaign,
        array $metrics,
    ): void {
        try {
            $message = sprintf(
                "⚠️ Campaign Rule Triggered\nRule: %s (%s)\nCampaign: %s\nSpend: %.2f | Revenue: %.2f | Profit: %.2f | ROI: %.2f%%",
                $rule->title,
                $rule->code_rule,
                $campaign->campaign_name,
                $metrics['spend'] ?? 0,
                $metrics['revenue'] ?? 0,
                $metrics['profit'] ?? 0,
                $metrics['roi'] ?? 0,
            );

            $this->telegramService->sendMessage($message, $setting?->telegram_chat_id);
        } catch (\Throwable $e) {
            Log::channel('tracking_events')->error('[EvaluateCampaignRuleAction] Telegram error', [
                'rule_id' => $rule->id,
                'campaign_id' => $campaign->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

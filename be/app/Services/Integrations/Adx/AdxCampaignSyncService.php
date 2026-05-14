<?php

namespace App\Services\Integrations\Adx;

use App\Models\AdxAccount;
use App\Models\AdxCampaign;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdxCampaignSyncService
{
    public function sync(): int
    {
        $synced = 0;

        $accounts = AdxAccount::query()
            ->whereNotNull('account_id')
            ->whereIn('status', ['ACTIVE', 'active'])
            ->where('source', 'google')
            ->get();

        foreach ($accounts as $account) {
            try {
                $campaigns = app(AdxGoogleAdsService::class)->getCampaigns($account->account_id);

                if ($campaigns === null) {
                    continue;
                }

                $synced += $this->persist($account->account_id, $account->source, $campaigns);
            } catch (Throwable $e) {
                Log::channel('sync_reports')->error('[AdxCampaignSync] Account failed', [
                    'account_id' => $account->account_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $synced;
    }

    /**
     * @param  list<array<string, mixed>>  $campaigns
     */
    private function persist(string $accountId, string $source, array $campaigns): int
    {
        $now = now();
        $count = 0;

        foreach ($campaigns as $campaign) {
            $adxCampaign = AdxCampaign::query()->updateOrCreate(
                [
                    'source' => $source,
                    'campaign_id' => (string) $campaign['campaign_id'],
                ],
                [
                    'adx_account_id' => $accountId,
                    'campaign_name' => $campaign['campaign_name'] ?? null,
                    'daily_budget' => (float) ($campaign['daily_budget'] ?? 0),
                    'lifetime_budget' => (float) ($campaign['lifetime_budget'] ?? 0),
                    'status' => $campaign['status'] ?? 'ACTIVE',
                    'start_time' => $campaign['start_time'] ?? null,
                    'stop_time' => $campaign['stop_time'] ?? null,
                    'created_time' => $campaign['created_time'] ?? null,
                    'updated_time' => $campaign['updated_time'] ?? null,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                ],
            );

            $this->ensureGamTargeting($adxCampaign, (string) $campaign['campaign_id']);

            $count++;
        }

        return $count;
    }

    private function ensureGamTargeting(AdxCampaign $adxCampaign, string $campaignId): void
    {
        if ($adxCampaign->gam_custom_key_id && $adxCampaign->gam_custom_value_id) {
            return;
        }

        $targeting = app(AdxGamCustomTargetingService::class)->ensureCampaignTargeting($campaignId);

        if ($targeting !== null) {
            $adxCampaign->update([
                'gam_custom_key' => $targeting['key_name'],
                'gam_custom_key_id' => $targeting['key_id'],
                'gam_custom_value' => $targeting['value_name'],
                'gam_custom_value_id' => $targeting['value_id'],
            ]);
        }
    }
}

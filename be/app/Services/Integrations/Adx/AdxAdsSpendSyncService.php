<?php

namespace App\Services\Integrations\Adx;

use App\Models\AdxAccount;
use App\Models\AdxCampaign;
use App\Models\AdxSpendReport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdxAdsSpendSyncService
{
    public function sync(string $startDate, string $endDate): int
    {
        $synced = 0;

        $accounts = AdxAccount::query()
            ->whereNotNull('account_id')
            ->whereIn('status', ['ACTIVE', 'active'])
            ->where('source', 'google')
            ->get();

        foreach ($accounts as $account) {
            try {
                $response = app(AdxGoogleAdsService::class)->getCampaignInsights(
                    $account->account_id,
                    $startDate,
                    $endDate,
                );

                if (! $response) {
                    continue;
                }

                $synced += $this->persist($account, $response);
            } catch (Throwable $e) {
                Log::channel('sync_reports')->error('[AdxAdsSpendSync] Account failed', [
                    'account_id' => $account->account_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $synced;
    }

    /**
     * @param  array{insights: list<array<string, mixed>>, campaigns: list<array<string, mixed>>}  $response
     */
    private function persist(AdxAccount $account, array $response): int
    {
        $now = now();
        $campaignsById = collect($response['campaigns'] ?? [])->keyBy('campaign_id');
        $count = 0;

        DB::transaction(function () use ($account, $response, $campaignsById, $now, &$count): void {
            foreach ($response['campaigns'] ?? [] as $campaign) {
                AdxCampaign::query()->updateOrCreate(
                    [
                        'source' => $account->source,
                        'campaign_id' => (string) $campaign['campaign_id'],
                    ],
                    [
                        'adx_account_id' => $account->account_id,
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
            }

            foreach ($response['insights'] ?? [] as $insight) {
                $campaignId = (string) ($insight['campaign_id'] ?? '');
                if ($campaignId === '') {
                    continue;
                }

                $campaign = $campaignsById->get($campaignId);
                AdxCampaign::query()->updateOrCreate(
                    [
                        'source' => $account->source,
                        'campaign_id' => $campaignId,
                    ],
                    [
                        'adx_account_id' => $account->account_id,
                        'campaign_name' => $campaign['campaign_name'] ?? null,
                        'daily_budget' => (float) ($campaign['daily_budget'] ?? 0),
                        'lifetime_budget' => (float) ($campaign['lifetime_budget'] ?? 0),
                        'status' => $campaign['status'] ?? 'ACTIVE',
                        'last_seen_at' => $now,
                    ],
                );

                AdxSpendReport::query()->updateOrCreate(
                    [
                        'date' => $insight['date_start'],
                        'source' => $account->source,
                        'account_id' => $account->account_id,
                        'campaign_id' => $campaignId,
                    ],
                    [
                        'account_name' => $account->account_name,
                        'campaign_name' => $campaign['campaign_name'] ?? null,
                        'impressions' => (int) ($insight['impressions'] ?? 0),
                        'clicks' => (int) ($insight['clicks'] ?? 0),
                        'cost' => (float) ($insight['spend'] ?? 0),
                        'currency' => strtoupper($insight['spend_type'] ?? 'USD'),
                        'landing_view' => (float) ($insight['landing_view'] ?? 0),
                        'get_game_link_click' => (float) ($insight['get_game_link_click'] ?? 0),
                        'detail_view' => (float) ($insight['detail_view'] ?? 0),
                        'get_bonus_click' => (float) ($insight['get_bonus_click'] ?? 0),
                        'fetched_at' => $now,
                    ],
                );

                $count++;
            }
        });

        return $count;
    }
}

<?php

namespace Database\Seeders;

use App\Models\AdxAccount;
use App\Models\AdxCampaign;
use App\Models\AdxCampaignReport;
use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Models\AdxLinkData;
use App\Models\AdxRealtimeReport;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdxCampaignReportLayoutSeeder extends Seeder
{
    private const ACCOUNT_COUNT = 5;

    private const CAMPAIGN_COUNT = 60;

    private const DAYS = 14;

    private const SOURCE = 'google';

    public function run(): void
    {
        $now = Carbon::now();
        $users = User::query()->pluck('id');
        $ownerId = $users->first();
        $games = $this->seedGames($ownerId);
        $accounts = $this->seedAccounts($ownerId);

        $accounts->each(function (AdxAccount $account) use ($users, $now): void {
            $users->each(fn (int $userId) => DB::table('adx_account_user')->updateOrInsert(
                [
                    'adx_account_id' => $account->id,
                    'user_id' => $userId,
                ],
                [
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ));
        });

        for ($index = 1; $index <= self::CAMPAIGN_COUNT; $index++) {
            $account = $accounts[($index - 1) % $accounts->count()];
            $game = $games[($index - 1) % $games->count()];
            $link = $this->seedLink($game, $ownerId, $index);
            $campaign = $this->seedCampaign($account, $index);
            $linkData = $this->seedLinkData($account, $campaign, $link, $game);

            for ($day = 0; $day < self::DAYS; $day++) {
                $date = Carbon::today()->subDays($day);
                $realtime = $this->seedRealtimeReport($linkData, $date, $index, $day);

                $this->seedCampaignReport($account, $campaign, $linkData, $link, $game, $realtime, $date, $index, $day);
            }
        }
    }

    /**
     * @return Collection<int, AdxGame>
     */
    private function seedGames(?int $ownerId)
    {
        for ($index = 1; $index <= 8; $index++) {
            AdxGame::query()->updateOrCreate(
                ['slug' => sprintf('adx-layout-game-%02d', $index)],
                [
                    'name' => sprintf('Layout Test Game %02d With A Rather Long Name', $index),
                    'thumbnail' => null,
                    'description' => 'Seed data for checking ADX campaign report table layout.',
                    'game_url' => sprintf('https://example.test/games/%02d', $index),
                    'status' => 'active',
                    'sort_order' => $index,
                    'created_by' => $ownerId,
                    'updated_by' => $ownerId,
                ],
            );
        }

        return AdxGame::query()
            ->where('slug', 'like', 'adx-layout-game-%')
            ->orderBy('id')
            ->get();
    }

    /**
     * @return Collection<int, AdxAccount>
     */
    private function seedAccounts(?int $ownerId)
    {
        for ($index = 1; $index <= self::ACCOUNT_COUNT; $index++) {
            AdxAccount::query()->updateOrCreate(
                [
                    'source' => self::SOURCE,
                    'account_id' => sprintf('ADX-LAYOUT-ACC-%03d', $index),
                ],
                [
                    'account_name' => sprintf('ADX Layout Account %03d - Very Long Name', $index),
                    'status' => 'ACTIVE',
                    'is_special' => false,
                    'sync_to_mcc' => false,
                    'created_by' => $ownerId,
                    'updated_by' => $ownerId,
                ],
            );
        }

        return AdxAccount::query()
            ->where('source', self::SOURCE)
            ->where('account_id', 'like', 'ADX-LAYOUT-ACC-%')
            ->orderBy('id')
            ->get();
    }

    private function seedLink(AdxGame $game, ?int $ownerId, int $index): AdxLink
    {
        return AdxLink::query()->updateOrCreate(
            [
                'adx_game_id' => $game->id,
                'name' => sprintf('Layout Link %03d', $index),
            ],
            [
                'landing_url' => sprintf('https://example.test/play/layout-%03d?utm_campaign=wide-table-check', $index),
                'status' => 'active',
                'created_by' => $ownerId,
                'updated_by' => $ownerId,
            ],
        );
    }

    private function seedCampaign(AdxAccount $account, int $index): AdxCampaign
    {
        return AdxCampaign::query()->updateOrCreate(
            [
                'source' => self::SOURCE,
                'campaign_id' => sprintf('ADX-LAYOUT-CAMP-%04d', $index),
            ],
            [
                'adx_account_id' => $account->account_id,
                'campaign_name' => sprintf('ADX Layout Campaign %04d - Long Name For Sticky Column QA', $index),
                'daily_budget' => 100 + ($index * 13.75),
                'lifetime_budget' => 2500 + ($index * 233.25),
                'gam_custom_key' => 'campid',
                'gam_custom_key_id' => 900000 + $index,
                'gam_custom_value' => sprintf('ADX-LAYOUT-CAMP-%04d', $index),
                'gam_custom_value_id' => 1900000 + $index,
                'status' => $index % 7 === 0 ? 'PAUSED' : 'ACTIVE',
                'start_time' => Carbon::today()->subDays(30),
                'stop_time' => null,
                'created_time' => Carbon::today()->subDays(45),
                'updated_time' => Carbon::now(),
                'first_seen_at' => Carbon::today()->subDays(30),
                'last_seen_at' => Carbon::now(),
            ],
        );
    }

    private function seedLinkData(AdxAccount $account, AdxCampaign $campaign, AdxLink $link, AdxGame $game): AdxLinkData
    {
        return AdxLinkData::query()->updateOrCreate(
            [
                'source' => self::SOURCE,
                'campaign_id' => $campaign->campaign_id,
                'adx_link_id' => $link->id,
            ],
            [
                'account_id' => $account->account_id,
                'adx_game_id' => $game->id,
                'first_seen_at' => Carbon::today()->subDays(30),
                'last_seen_at' => Carbon::now(),
            ],
        );
    }

    private function seedRealtimeReport(AdxLinkData $linkData, Carbon $date, int $index, int $day): AdxRealtimeReport
    {
        $base = ($index * 17) + ($day * 11);

        return AdxRealtimeReport::query()->updateOrCreate(
            [
                'report_date' => $date->toDateString(),
                'adx_link_data_id' => $linkData->id,
            ],
            [
                'landing_views' => $base + 450,
                'get_game_link_clicks' => $base + 180,
                'detail_views' => $base + 260,
                'get_bonus_clicks' => $base + 95,
            ],
        );
    }

    private function seedCampaignReport(
        AdxAccount $account,
        AdxCampaign $campaign,
        AdxLinkData $linkData,
        AdxLink $link,
        AdxGame $game,
        AdxRealtimeReport $realtime,
        Carbon $date,
        int $index,
        int $day,
    ): void {
        $spend = round(35 + ($index * 4.17) + ($day * 2.35), 4);
        $revenue = round($spend * (0.75 + (($index % 11) * 0.11)) + ($day * 1.23), 4);
        $profit = $revenue - $spend;
        $adsClicks = 40 + ($index * 3) + ($day * 2);
        $adsImpressions = 2500 + ($index * 241) + ($day * 133);
        $adxImpressions = 1800 + ($index * 197) + ($day * 91);

        AdxCampaignReport::query()->updateOrCreate(
            [
                'date' => $date->toDateString(),
                'source' => self::SOURCE,
                'account_id' => $account->account_id,
                'campaign_id' => $campaign->campaign_id,
                'adx_link_data_id' => $linkData->id,
            ],
            [
                'adx_account_id' => $account->id,
                'adx_campaign_id' => $campaign->id,
                'adx_link_id' => $link->id,
                'adx_game_id' => $game->id,
                'adx_realtime_report_id' => $realtime->id,
                'account_name' => $account->account_name,
                'campaign_name' => $campaign->campaign_name,
                'campaign_status' => $campaign->status,
                'daily_budget' => $campaign->daily_budget,
                'lifetime_budget' => $campaign->lifetime_budget,
                'spend' => $spend,
                'revenue' => $revenue,
                'profit' => $profit,
                'roi' => $spend > 0 ? ($profit / $spend) * 100 : 0,
                'roas' => $spend > 0 ? $revenue / $spend : 0,
                'ads_clicks' => $adsClicks,
                'ads_impressions' => $adsImpressions,
                'landing_view' => $realtime->landing_views + ($index % 5),
                'get_game_link_click' => $realtime->get_game_link_clicks + ($index % 7),
                'detail_view' => $realtime->detail_views + ($index % 3),
                'get_bonus_click' => $realtime->get_bonus_clicks + ($index % 4),
                'adx_impressions' => $adxImpressions,
                'adx_clicks' => 25 + ($index * 2) + $day,
                'adx_requests' => $adxImpressions + 650 + ($index * 19),
                'adx_matched_requests' => $adxImpressions + 420 + ($index * 13),
                'adx_viewable_impressions' => (int) round($adxImpressions * 0.72),
                'cpc' => $adsClicks > 0 ? $spend / $adsClicks : 0,
                'epc' => $adsClicks > 0 ? $revenue / $adsClicks : 0,
                'rpm' => $adxImpressions > 0 ? ($revenue / $adxImpressions) * 1000 : 0,
                'currency' => 'USD',
            ],
        );
    }
}

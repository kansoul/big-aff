<?php

namespace Database\Seeders;

use App\Models\AdClient;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\Channel;
use App\Models\InsightChartReport;
use App\Models\InsightReport;
use App\Models\LinkData;
use App\Models\RealtimeReport;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Style;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Populates all analytical/report tables using the real identifiers seeded by AdsSeeder:
 *   - insight_reports.account_id           → accounts.account_id (string business id)
 *   - insight_reports.campaign_id          → campaigns.campaign_id
 *   - insight_chart_reports.*              → idem
 *   - campaign_reports.account_id          → accounts.account_id
 *   - campaign_reports.campaign_id / name  → campaigns.*
 *   - campaign_reports.style_code/channel_code → styles.code / channels.code
 *   - revenue_reports.style_code/channel_code  → styles.code / channels.code
 *   - revenue_reports.ad_client_id         → ad_clients.ad_client_id
 *   - revenue_chart_reports.*              → idem (hourly)
 *
 * Reports are idempotent — a table is only seeded if it's currently empty.
 */
class ReportsSeeder extends Seeder
{
    private const DAILY_DAYS = 30;

    private const CHART_DAYS = 7;

    private const CAMPAIGN_REPORT_DAYS = 14;

    public function run(): void
    {
        $campaigns = Campaign::query()->with('account')->get();
        if ($campaigns->isEmpty()) {
            return;
        }

        $styles = Style::query()->get();
        $channels = Channel::query()->get();
        $adClients = AdClient::query()->get();

        $linkDataByCampaignId = LinkData::query()
            ->whereNotNull('campaign_id')
            ->get()
            ->keyBy('campaign_id');

        $this->seedRevenueReports($styles, $channels, $adClients);
        $this->seedRevenueChartReports($styles, $channels, $adClients);
        $this->seedInsightReports($campaigns);
        $this->seedInsightChartReports($campaigns);
        $this->seedCampaignReports($campaigns, $styles, $channels, $linkDataByCampaignId);
    }

    /**
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     * @param  Collection<int, AdClient>  $adClients
     */
    private function seedRevenueReports(Collection $styles, Collection $channels, Collection $adClients): void
    {
        if (RevenueReport::query()->exists() || $styles->isEmpty() || $channels->isEmpty()) {
            return;
        }

        foreach ($styles as $style) {
            $channel = $channels->random();
            $adClientId = $adClients->isNotEmpty() ? $adClients->random()->ad_client_id : 'ca-pub-'.fake()->numerify('##############');

            for ($day = self::DAILY_DAYS; $day >= 0; $day--) {
                RevenueReport::factory()->create([
                    'ad_client_id' => $adClientId,
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => $channel->code,
                    'channel_name' => $channel->name,
                    'date' => Carbon::now()->subDays($day)->toDateString(),
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     * @param  Collection<int, AdClient>  $adClients
     */
    private function seedRevenueChartReports(Collection $styles, Collection $channels, Collection $adClients): void
    {
        if (RevenueChartReport::query()->exists() || $styles->isEmpty() || $channels->isEmpty()) {
            return;
        }

        foreach ($styles as $style) {
            $channel = $channels->random();
            $adClientId = $adClients->isNotEmpty() ? $adClients->random()->ad_client_id : 'ca-pub-'.fake()->numerify('##############');

            for ($hoursAgo = 24 * self::CHART_DAYS; $hoursAgo >= 0; $hoursAgo--) {
                $datetime = Carbon::now()->subHours($hoursAgo)->startOfHour();

                RevenueChartReport::query()->firstOrCreate(
                    ['style_code' => $style->code, 'datetime' => $datetime],
                    RevenueChartReport::factory()->make([
                        'ad_client_id' => $adClientId,
                        'style_code' => $style->code,
                        'style_name' => $style->name,
                        'channel_code' => $channel->code,
                        'channel_name' => $channel->name,
                        'datetime' => $datetime,
                    ])->toArray(),
                );
            }
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, Campaign>  $campaigns
     */
    private function seedInsightReports(\Illuminate\Database\Eloquent\Collection $campaigns): void
    {
        if (InsightReport::query()->exists()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            for ($day = self::DAILY_DAYS; $day >= 0; $day--) {
                InsightReport::factory()->create([
                    // account_id is the string business id (accounts.account_id),
                    // mirroring the conversions table contract.
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'date_start' => Carbon::now()->subDays($day)->toDateString(),
                    'spend_type' => 'USD',
                ]);
            }
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, Campaign>  $campaigns
     */
    private function seedInsightChartReports(\Illuminate\Database\Eloquent\Collection $campaigns): void
    {
        if (InsightChartReport::query()->exists()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            for ($day = self::CHART_DAYS; $day >= 0; $day--) {
                InsightChartReport::factory()->create([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'datetime_start' => Carbon::now()->subDays($day)->startOfDay(),
                ]);
            }
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, Campaign>  $campaigns
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     * @param  Collection<string, LinkData>  $linkDataByCampaignId
     */
    private function seedCampaignReports(
        \Illuminate\Database\Eloquent\Collection $campaigns,
        Collection $styles,
        Collection $channels,
        Collection $linkDataByCampaignId,
    ): void {
        if (CampaignReport::query()->exists()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            $linkData = $linkDataByCampaignId->get($campaign->campaign_id);
            $style = $styles->firstWhere('code', $linkData?->style_code) ?? ($styles->isNotEmpty() ? $styles->random() : null);
            $channel = $channels->firstWhere('code', $linkData?->channel_code) ?? ($channels->isNotEmpty() ? $channels->random() : null);

            for ($day = self::CAMPAIGN_REPORT_DAYS; $day >= 0; $day--) {
                $date = Carbon::now()->subDays($day)->toDateString();

                $realtime = null;
                if ($linkData !== null) {
                    $realtime = RealtimeReport::query()->firstOrCreate(
                        ['event_time' => $date, 'link_data_id' => $linkData->id],
                        [
                            'view_article_count' => random_int(50, 800),
                            'view_search_count' => random_int(30, 700),
                            'click_keyword_count' => random_int(5, 200),
                            'click_ad_count' => random_int(2, 150),
                        ],
                    );
                }

                CampaignReport::factory()->create([
                    'realtime_report_id' => $realtime?->id,
                    'date_start' => $date,
                    // account_id uses the string business id (accounts.account_id),
                    // matching the conversions table and the user's data contract.
                    'account_id' => $campaign->account_id,
                    'account_name' => $campaign->account?->account_name,
                    'campaign_id' => $campaign->campaign_id,
                    'campaign_name' => $campaign->campaign_name,
                    'campaign_status' => $campaign->status,
                    'ads_type' => $campaign->ads_type,
                    'daily_budget' => $campaign->daily_budget,
                    'lifetime_budget' => $campaign->lifetime_budget,
                    'style_code' => $style?->code,
                    'style_name' => $style?->name,
                    'channel_code' => $channel?->code,
                    'channel_name' => $channel?->name,
                ]);
            }
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\AdClient;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\Channel;
use App\Models\InsightChartReport;
use App\Models\InsightReport;
use App\Models\LinkData;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Style;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

    private const CHUNK_SIZE = 500;

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

        $now = Carbon::now();
        $rows = [];

        foreach ($styles as $style) {
            $channel = $channels->random();
            $adClientId = $adClients->isNotEmpty() ? $adClients->random()->ad_client_id : 'ca-pub-'.fake()->numerify('##############');

            for ($day = self::DAILY_DAYS; $day >= 0; $day--) {
                $rows[] = RevenueReport::factory()->make([
                    'ad_client_id' => $adClientId,
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => $channel->code,
                    'channel_name' => $channel->name,
                    'date' => $now->copy()->subDays($day)->toDateString(),
                ])->toArray();

                if (count($rows) >= self::CHUNK_SIZE) {
                    DB::table('revenue_reports')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('revenue_reports')->insert($rows);
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

        $now = Carbon::now();
        $rows = [];
        $seen = [];

        foreach ($styles as $style) {
            $channel = $channels->random();
            $adClientId = $adClients->isNotEmpty() ? $adClients->random()->ad_client_id : 'ca-pub-'.fake()->numerify('##############');

            for ($hoursAgo = 24 * self::CHART_DAYS; $hoursAgo >= 0; $hoursAgo--) {
                $datetime = $now->copy()->subHours($hoursAgo)->startOfHour()->toDateTimeString();
                $key = $style->code.'|'.$datetime;

                if (isset($seen[$key])) {
                    continue;
                }

                $seen[$key] = true;

                $rows[] = RevenueChartReport::factory()->make([
                    'ad_client_id' => $adClientId,
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => $channel->code,
                    'channel_name' => $channel->name,
                    'datetime' => $datetime,
                ])->toArray();

                if (count($rows) >= self::CHUNK_SIZE) {
                    DB::table('revenue_chart_reports')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('revenue_chart_reports')->insert($rows);
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

        $now = Carbon::now();
        $rows = [];

        foreach ($campaigns as $campaign) {
            for ($day = self::DAILY_DAYS; $day >= 0; $day--) {
                $rows[] = InsightReport::factory()->make([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'date_start' => $now->copy()->subDays($day)->toDateString(),
                    'spend_type' => 'USD',
                ])->toArray();

                if (count($rows) >= self::CHUNK_SIZE) {
                    DB::table('insight_reports')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('insight_reports')->insert($rows);
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

        $now = Carbon::now();
        $rows = [];

        foreach ($campaigns as $campaign) {
            for ($day = self::CHART_DAYS; $day >= 0; $day--) {
                $rows[] = InsightChartReport::factory()->make([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'datetime_start' => $now->copy()->subDays($day)->startOfDay()->toDateTimeString(),
                ])->toArray();

                if (count($rows) >= self::CHUNK_SIZE) {
                    DB::table('insight_chart_reports')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('insight_chart_reports')->insert($rows);
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

        $now = Carbon::now();

        // Pre-create all RealtimeReports in bulk, keyed by "link_data_id|date"
        $realtimeMap = $this->seedRealtimeReports($campaigns, $linkDataByCampaignId, $now);

        $rows = [];

        foreach ($campaigns as $campaign) {
            $linkData = $linkDataByCampaignId->get($campaign->campaign_id);
            $style = $styles->firstWhere('code', $linkData?->style_code) ?? ($styles->isNotEmpty() ? $styles->random() : null);
            $channel = $channels->firstWhere('code', $linkData?->channel_code) ?? ($channels->isNotEmpty() ? $channels->random() : null);

            for ($day = self::CAMPAIGN_REPORT_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();
                $realtimeId = $linkData ? ($realtimeMap[$linkData->id.'|'.$date] ?? null) : null;

                $rows[] = CampaignReport::factory()->make([
                    'realtime_report_id' => $realtimeId,
                    'date_start' => $date,
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
                ])->toArray();

                if (count($rows) >= self::CHUNK_SIZE) {
                    DB::table('campaign_reports')->insert($rows);
                    $rows = [];
                }
            }
        }

        if ($rows) {
            DB::table('campaign_reports')->insert($rows);
        }
    }

    /**
     * Bulk-inserts RealtimeReports for all campaigns that have LinkData,
     * then returns a map of "link_data_id|date" → realtime_report id.
     *
     * @param  \Illuminate\Database\Eloquent\Collection<int, Campaign>  $campaigns
     * @param  Collection<string, LinkData>  $linkDataByCampaignId
     * @return array<string, int>
     */
    private function seedRealtimeReports(
        \Illuminate\Database\Eloquent\Collection $campaigns,
        Collection $linkDataByCampaignId,
        Carbon $now,
    ): array {
        $toInsert = [];
        $keys = [];

        foreach ($campaigns as $campaign) {
            $linkData = $linkDataByCampaignId->get($campaign->campaign_id);
            if ($linkData === null) {
                continue;
            }

            for ($day = self::CAMPAIGN_REPORT_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();
                $key = $linkData->id.'|'.$date;

                if (isset($keys[$key])) {
                    continue;
                }

                $keys[$key] = true;
                $toInsert[] = [
                    'link_data_id' => $linkData->id,
                    'event_time' => $date,
                    'view_article_count' => random_int(50, 800),
                    'view_search_count' => random_int(30, 700),
                    'click_keyword_count' => random_int(5, 200),
                    'click_ad_count' => random_int(2, 150),
                ];
            }
        }

        if (empty($toInsert)) {
            return [];
        }

        foreach (array_chunk($toInsert, self::CHUNK_SIZE) as $chunk) {
            DB::table('realtime_reports')->insertOrIgnore($chunk);
        }

        // Fetch inserted IDs back into the map
        $linkDataIds = array_unique(array_column($toInsert, 'link_data_id'));
        $dates = array_unique(array_column($toInsert, 'event_time'));

        $records = DB::table('realtime_reports')
            ->whereIn('link_data_id', $linkDataIds)
            ->whereIn('event_time', $dates)
            ->get(['id', 'link_data_id', 'event_time']);

        $map = [];
        foreach ($records as $record) {
            $map[$record->link_data_id.'|'.$record->event_time] = $record->id;
        }

        return $map;
    }
}

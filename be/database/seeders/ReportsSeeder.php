<?php

namespace Database\Seeders;

use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\ClickTracking;
use App\Models\InsightChartReport;
use App\Models\InsightReport;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\TrackingSession;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Populates all analytical/report tables using the real identifiers seeded by AdsSeeder:
 *   - insight_reports.account_id           → accounts.account_id (string business id)
 *   - insight_reports.campaign_id          → campaigns.campaign_id
 *   - insight_chart_reports.*              → idem
 *   - campaign_reports.account_id          → accounts.account_id
 *   - campaign_reports.campaign_id / name  → campaigns.*
 *   - campaign_reports style/channel names → report snapshots
 *
 * Reports are idempotent — a table is only seeded if it's currently empty.
 */
class ReportsSeeder extends Seeder
{
    private const DAILY_DAYS = 2;

    private const CHART_DAYS = 2;

    private const CAMPAIGN_REPORT_DAYS = 2;

    /** Days of ad-level / adset-level insights per campaign. */
    private const ENTITY_INSIGHT_DAYS = 1;

    private const REVENUE_REPORT_COUNT = 3;

    private const REVENUE_CHART_REPORT_COUNT = 3;

    private const CHUNK_SIZE = 500;

    public function run(): void
    {
        $campaigns = Campaign::query()->with('account')->get();
        if ($campaigns->isEmpty()) {
            return;
        }

        $this->seedInsightReports($campaigns);
        $this->seedInsightChartReports($campaigns);
        $this->seedCampaignReports($campaigns);
        $this->seedEntityInsightReports($campaigns);
        $this->seedRevenueReports($campaigns);
        $this->seedRevenueChartReports();
    }

    /**
     * Ad-level and adset-level insights. Each campaign gets one adset, and that adset gets
     * one ad, so `ads_insights_reports.adset_id` always resolves to an adset report row.
     *
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedEntityInsightReports(Collection $campaigns): void
    {
        if (AdsInsightsReport::query()->exists() && AdsetInsightsReport::query()->exists()) {
            return;
        }

        $now = Carbon::now();

        foreach ($campaigns as $campaign) {
            $adsetId = fake()->numerify('################');
            $adId = fake()->numerify('################');

            for ($day = self::ENTITY_INSIGHT_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();

                $shared = [
                    'adset_id' => $adsetId,
                    'campaign_id' => $campaign->campaign_id,
                    'account_id' => $campaign->account_id,
                    'status' => $campaign->status,
                    'effective_status' => $campaign->status,
                    'date_start' => $date,
                    'date_stop' => $date,
                ];

                AdsetInsightsReport::factory()->create($shared + [
                    'adset_name' => $campaign->campaign_name.' — Adset',
                ]);

                AdsInsightsReport::factory()->create($shared + [
                    'ad_id' => $adId,
                    'ad_name' => $campaign->campaign_name.' — Ad',
                ]);
            }
        }
    }

    /**
     * Revenue rows keyed to real sessions, campaigns and click events.
     *
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedRevenueReports(Collection $campaigns): void
    {
        if (RevenueReport::query()->exists()) {
            return;
        }

        $sessionIds = TrackingSession::query()->pluck('session_id');
        $clickIds = ClickTracking::query()->pluck('id');

        for ($i = 0; $i < self::REVENUE_REPORT_COUNT; $i++) {
            $campaign = $campaigns[$i % $campaigns->count()];

            RevenueReport::factory()->create([
                'session_id' => $sessionIds->isNotEmpty()
                    ? $sessionIds[$i % $sessionIds->count()]
                    : fake()->uuid(),
                'campaign_id' => $campaign->campaign_id,
                'click_id' => $clickIds->isNotEmpty()
                    ? $clickIds[$i % $clickIds->count()]
                    : fake()->numberBetween(1, 1_000_000),
            ]);
        }
    }

    /**
     * Hourly chart rows for a single channel so the revenue chart has a series to draw.
     */
    private function seedRevenueChartReports(): void
    {
        if (RevenueChartReport::query()->exists()) {
            return;
        }

        $now = Carbon::now()->startOfHour();

        for ($i = self::REVENUE_CHART_REPORT_COUNT - 1; $i >= 0; $i--) {
            RevenueChartReport::factory()->create([
                'datetime' => $now->copy()->subHours($i),
            ]);
        }
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedInsightReports(Collection $campaigns): void
    {
        if (InsightReport::query()->exists()) {
            return;
        }

        $now = Carbon::now();
        $rows = [];

        foreach ($campaigns as $campaign) {
            for ($day = self::DAILY_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();
                $row = InsightReport::factory()->make([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'date_start' => $date,
                    'spend_type' => 'USD',
                ])->getAttributes();
                $row['date_start'] = $date;
                $rows[] = $row;

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
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedInsightChartReports(Collection $campaigns): void
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
                ])->getAttributes();

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
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function seedCampaignReports(Collection $campaigns): void
    {
        if (CampaignReport::query()->exists()) {
            return;
        }

        $now = Carbon::now();

        $realtimeMap = $this->seedRealtimeReports($campaigns, $now);

        $rows = [];

        foreach ($campaigns as $campaign) {
            for ($day = self::CAMPAIGN_REPORT_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();
                $realtimeId = $realtimeMap[$campaign->campaign_id.'|'.$date] ?? null;

                $row = CampaignReport::factory()->make([
                    'realtime_report_id' => $realtimeId,
                    'date_start' => $date,
                    'account_id' => $campaign->account_id,
                    'account_name' => $campaign->account?->account_name,
                    'campaign_id' => $campaign->campaign_id,
                    'campaign_name' => $campaign->campaign_name,
                    'campaign_status' => $campaign->status,
                    'ads_type' => $campaign->ads_type,
                ])->getAttributes();
                $row['date_start'] = $date;
                $rows[] = $row;

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
     * Bulk-inserts RealtimeReports and returns a map of "campaign_id|date" to id.
     *
     * @param  Collection<int, Campaign>  $campaigns
     * @return array<string, int>
     */
    private function seedRealtimeReports(
        Collection $campaigns,
        Carbon $now,
    ): array {
        $toInsert = [];
        $keys = [];

        foreach ($campaigns as $campaign) {
            for ($day = self::CAMPAIGN_REPORT_DAYS; $day >= 0; $day--) {
                $date = $now->copy()->subDays($day)->toDateString();
                $key = $campaign->campaign_id.'|'.$date;

                if (isset($keys[$key])) {
                    continue;
                }

                $keys[$key] = true;
                $toInsert[] = [
                    'campaign_id' => $campaign->campaign_id,
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
        $campaignIds = array_unique(array_column($toInsert, 'campaign_id'));
        $dates = array_unique(array_column($toInsert, 'event_time'));

        $records = DB::table('realtime_reports')
            ->whereIn('campaign_id', $campaignIds)
            ->whereIn('event_time', $dates)
            ->get(['id', 'campaign_id', 'event_time']);

        $map = [];
        foreach ($records as $record) {
            $map[$record->campaign_id.'|'.$record->event_time] = $record->id;
        }

        return $map;
    }
}

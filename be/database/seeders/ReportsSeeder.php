<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\InsightChartReport;
use App\Models\InsightReport;
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

        $this->seedInsightReports($campaigns);
        $this->seedInsightChartReports($campaigns);
        $this->seedCampaignReports($campaigns);
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

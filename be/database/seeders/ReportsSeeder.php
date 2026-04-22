<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignReport;
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

class ReportsSeeder extends Seeder
{
    private const DAYS = 30;

    public function run(): void
    {
        $styles = Style::query()->limit(10)->get();
        $campaigns = Campaign::query()
            ->with('account')
            ->limit(40)
            ->get();
        $linkDataByCampaignId = LinkData::query()
            ->whereNotNull('campaign_id')
            ->limit(200)
            ->get()
            ->keyBy('campaign_id');

        $this->seedRevenueReports($styles);
        $this->seedRevenueChartReports($styles);
        $this->seedInsightReports($campaigns);
        $this->seedInsightChartReports($campaigns);
        $this->seedCampaignReports($campaigns, $linkDataByCampaignId);
    }

    /**
     * @param  Collection<int, Style>  $styles
     */
    private function seedRevenueReports(Collection $styles): void
    {
        if (RevenueReport::query()->exists()) {
            return;
        }

        foreach ($styles as $style) {
            for ($day = self::DAYS; $day >= 0; $day--) {
                RevenueReport::factory()->create([
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'date' => Carbon::now()->subDays($day)->toDateString(),
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Style>  $styles
     */
    private function seedRevenueChartReports(Collection $styles): void
    {
        if (RevenueChartReport::query()->exists()) {
            return;
        }

        foreach ($styles as $style) {
            for ($hoursAgo = 24 * 7; $hoursAgo >= 0; $hoursAgo--) {
                $datetime = Carbon::now()->subHours($hoursAgo)->startOfHour();

                RevenueChartReport::query()->firstOrCreate(
                    ['style_code' => $style->code, 'datetime' => $datetime],
                    RevenueChartReport::factory()->make([
                        'style_code' => $style->code,
                        'style_name' => $style->name,
                        'datetime' => $datetime,
                    ])->toArray(),
                );
            }
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

        foreach ($campaigns as $campaign) {
            for ($day = self::DAYS; $day >= 0; $day--) {
                InsightReport::factory()->create([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'date_start' => Carbon::now()->subDays($day)->toDateString(),
                    'spend_type' => 'USD',
                ]);
            }
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

        foreach ($campaigns as $campaign) {
            for ($day = 7; $day >= 0; $day--) {
                InsightChartReport::factory()->create([
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                    'datetime_start' => Carbon::now()->subDays($day)->startOfDay(),
                ]);
            }
        }
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     * @param  Collection<string, LinkData>  $linkDataByCampaignId
     */
    private function seedCampaignReports(Collection $campaigns, Collection $linkDataByCampaignId): void
    {
        if (CampaignReport::query()->exists()) {
            return;
        }

        $channelCodes = ['chan_tech', 'chan_lifestyle', 'chan_finance', 'chan_health', 'chan_sports'];

        foreach ($campaigns as $campaign) {
            $linkData = $linkDataByCampaignId->get($campaign->campaign_id);

            for ($day = 14; $day >= 0; $day--) {
                $date = Carbon::now()->subDays($day)->toDateString();

                $realtime = null;
                if ($linkData && random_int(1, 10) <= 6) {
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
                    // ownership uses accounts.id (int) stored as string in campaign_reports.account_id
                    'account_id' => (string) $campaign->account?->id,
                    'account_name' => $campaign->account?->account_name,
                    'campaign_id' => $campaign->campaign_id,
                    'campaign_name' => $campaign->campaign_name,
                    'campaign_status' => $campaign->status,
                    'ads_type' => $campaign->ads_type,
                    'daily_budget' => $campaign->daily_budget,
                    'channel_code' => fake()->randomElement($channelCodes),
                ]);
            }
        }
    }
}

<?php

namespace Database\Factories;

use App\Models\CampaignReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CampaignReport>
 */
class CampaignReportFactory extends Factory
{
    protected $model = CampaignReport::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $adsType = fake()->randomElement(['google', 'tiktok']);

        return [
            'realtime_report_id' => null,
            'date_start' => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'account_id' => null, // override in seeder
            'account_name' => fake()->company().' Ads',
            'campaign_id' => fake()->unique()->numerify('##############'),
            'campaign_name' => ucfirst(fake()->words(fake()->numberBetween(3, 5), true)),
            'campaign_status' => fake()->randomElement(['ACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED']),
            'ads_type' => $adsType,
            'r_search_views' => 0,
            'r_conversion' => 0,
            'r_revenue' => 0,
            'r_rpc' => 0,
            'r_ad_requests' => 0,
            'r_ad_requests_rpm' => 0,
            'r_impressions' => 0,
            'r_impressions_rpm' => 0,
            'r_funnel_requests' => 0,
            'r_funnel_clicks' => 0,
            'r_funnel_impressions' => 0,
            'r_funnel_rpm' => 0,
            'r_cpa' => 0,
        ];
    }
}

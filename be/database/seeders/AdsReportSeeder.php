<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Models\Style;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds related dummy data for the Ads Report screen:
 *   Style → RevenueReport (linked by style_code)
 *   Account → Campaign → InsightReport (linked by account_id / campaign_id strings)
 */
class AdsReportSeeder extends Seeder
{
    /** Number of days of historical data to generate */
    private const DAYS = 30;

    public function run(): void
    {
        $user = User::where('email', 'admin@example.com')->first()
            ?? User::factory()->create([
                'name' => 'Admin',
                'email' => 'admin@example.com',
            ]);

        $this->seedStyles($user);
        $this->seedAdsData($user);
    }

    private function seedStyles(User $user): void
    {
        $styleDefinitions = [
            ['code' => 'style_abc001', 'name' => 'Blue Banner'],
            ['code' => 'style_def002', 'name' => 'Red Square'],
            ['code' => 'style_ghi003', 'name' => 'Green Leaderboard'],
            ['code' => 'style_jkl004', 'name' => 'Purple Skyscraper'],
            ['code' => 'style_mno005', 'name' => 'Orange Native'],
        ];

        $channelCodes = ['chan_tech', 'chan_lifestyle', 'chan_finance', 'chan_health', 'chan_sports'];
        $channelNames = ['Tech Channel', 'Lifestyle Channel', 'Finance Channel', 'Health Channel', 'Sports Channel'];

        foreach ($styleDefinitions as $def) {
            $style = Style::firstOrCreate(
                ['code' => $def['code']],
                ['name' => $def['name'], 'created_by' => $user->id],
            );

            // One RevenueReport record per day per style for the last N days
            for ($day = self::DAYS; $day >= 0; $day--) {
                $date = now()->subDays($day)->format('Y-m-d');
                $channelIndex = array_rand($channelCodes);

                RevenueReport::factory()->create([
                    'style_code' => $style->code,
                    'style_name' => $style->name,
                    'channel_code' => $channelCodes[$channelIndex],
                    'channel_name' => $channelNames[$channelIndex],
                    'date' => $date,
                ]);
            }
        }
    }

    private function seedAdsData(User $user): void
    {
        // 3 Facebook + 2 Google accounts
        $accountDefinitions = [
            ['ads_type' => 'facebook', 'account_id' => 'act_1000000001', 'account_name' => 'Alpha Media Facebook'],
            ['ads_type' => 'facebook', 'account_id' => 'act_1000000002', 'account_name' => 'Beta Growth Facebook'],
            ['ads_type' => 'facebook', 'account_id' => 'act_1000000003', 'account_name' => 'Gamma Boost Facebook'],
            ['ads_type' => 'google', 'account_id' => 'goog_2000000001', 'account_name' => 'Alpha Media Google'],
            ['ads_type' => 'google', 'account_id' => 'goog_2000000002', 'account_name' => 'Beta Growth Google'],
        ];

        foreach ($accountDefinitions as $def) {
            $account = Account::firstOrCreate(
                ['account_id' => $def['account_id']],
                [
                    'account_name' => $def['account_name'],
                    'ads_type' => $def['ads_type'],
                    'status' => 'ACTIVE',
                    'created_by' => $user->id,
                ],
            );

            $this->seedCampaignsForAccount($account, $user);
        }
    }

    private function seedCampaignsForAccount(Account $account, User $user): void
    {
        $campaignCount = fake()->numberBetween(3, 6);

        $statusPool = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

        for ($c = 1; $c <= $campaignCount; $c++) {
            $campaignId = 'camp_'.$account->account_id.'_'.str_pad((string) $c, 3, '0', STR_PAD_LEFT);
            $status = $statusPool[array_rand($statusPool)];

            $campaign = Campaign::firstOrCreate(
                ['campaign_id' => $campaignId],
                [
                    'account_id' => $account->account_id,
                    'campaign_name' => ucfirst(fake()->words(fake()->numberBetween(3, 5), true)),
                    'ads_type' => $account->ads_type,
                    'daily_budget' => fake()->randomFloat(2, 50, 2000),
                    'lifetime_budget' => null,
                    'status' => $status,
                    'start_time' => now()->subMonths(3),
                    'stop_time' => $status === 'ARCHIVED' ? now()->subDays(15) : null,
                    'created_by' => $user->id,
                ],
            );

            $this->seedInsightReportsForCampaign($campaign);
        }
    }

    private function seedInsightReportsForCampaign(Campaign $campaign): void
    {
        for ($day = self::DAYS; $day >= 0; $day--) {
            $date = now()->subDays($day)->format('Y-m-d');

            $exists = InsightReport::where('account_id', $campaign->account_id)
                ->where('campaign_id', $campaign->campaign_id)
                ->where('date_start', $date)
                ->exists();

            if ($exists) {
                continue;
            }

            InsightReport::factory()->create([
                'account_id' => $campaign->account_id,
                'campaign_id' => $campaign->campaign_id,
                'date_start' => $date,
                'spend_type' => 'USD',
            ]);
        }
    }
}

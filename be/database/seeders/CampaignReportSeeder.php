<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\Account;
use App\Models\AdsLink;
use App\Models\CampaignReport;
use App\Models\LinkData;
use App\Models\RealtimeReport;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seed data for Campaign Report screen:
 * - Users + role with CampaignReportsView permission
 * - Accounts + account_user pivot (for OwnershipFilter)
 * - LinkData + RealtimeReport (for link_data_id filtering + realtime columns)
 * - CampaignReport rows across multiple days/styles/channels/campaigns
 */
class CampaignReportSeeder extends Seeder
{
    private const DAYS = 14;

    public function run(): void
    {
        $role = $this->ensureRole();
        $user = $this->ensureUser($role);

        $accounts = [
            $this->firstOrCreateAccount($user, 'act_9000000001', 'Seed FB Account', 'facebook'),
            $this->firstOrCreateAccount($user, 'goog_9000000002', 'Seed Google Account', 'google'),
        ];

        foreach ($accounts as $account) {
            $account->users()->syncWithoutDetaching([$user->id]);
        }

        $styles = [
            ['code' => 'style_seed_001', 'name' => 'Seed Style 001'],
            ['code' => 'style_seed_002', 'name' => 'Seed Style 002'],
            ['code' => 'style_seed_003', 'name' => 'Seed Style 003'],
        ];

        $channels = [
            ['code' => 'chan_seed_tech', 'name' => 'Seed Channel Tech'],
            ['code' => 'chan_seed_finance', 'name' => 'Seed Channel Finance'],
            ['code' => 'chan_seed_health', 'name' => 'Seed Channel Health'],
        ];

        foreach ($accounts as $account) {
            $campaignIds = [
                'camp_seed_'.$account->account_id.'_001',
                'camp_seed_'.$account->account_id.'_002',
                'camp_seed_'.$account->account_id.'_003',
            ];

            $linkData = [];
            foreach ($campaignIds as $idx => $campaignId) {
                $style = $styles[$idx % count($styles)];
                $channel = $channels[$idx % count($channels)];

                $adsLink = AdsLink::factory()->create([
                    'created_by' => $user->id,
                    'updated_by' => $user->id,
                    'style_code' => $style['code'],
                    'channel_code' => $channel['code'],
                ]);

                $linkData[] = LinkData::query()->firstOrCreate(
                    ['campaign_id' => $campaignId],
                    [
                        'ads_link_id' => $adsLink->id,
                        'style_code' => $style['code'],
                        'channel_code' => $channel['code'],
                        'created_by' => $user->id,
                        'updated_by' => $user->id,
                    ],
                );
            }

            foreach ($campaignIds as $cIdx => $campaignId) {
                $campaignName = 'Seed Campaign '.str_pad((string) ($cIdx + 1), 3, '0', STR_PAD_LEFT);
                $style = $styles[$cIdx % count($styles)];
                $channel = $channels[$cIdx % count($channels)];
                $link = $linkData[$cIdx % count($linkData)];

                for ($day = self::DAYS; $day >= 0; $day--) {
                    $date = now()->subDays($day)->toDateString();

                    $existing = CampaignReport::query()
                        ->where('account_id', (string) $account->id)
                        ->where('campaign_id', $campaignId)
                        ->whereDate('date_start', $date)
                        ->exists();

                    if ($existing) {
                        continue;
                    }

                    // Create a RealtimeReport for ~60% of the rows, so the UI can test null + present cases.
                    $realtime = null;
                    if (random_int(1, 10) <= 6) {
                        $realtime = RealtimeReport::query()->create([
                            'event_time' => $date,
                            'link_data_id' => $link->id,
                            'view_article_count' => random_int(50, 500),
                            'view_search_count' => random_int(30, 450),
                            'click_keyword_count' => random_int(5, 120),
                            'click_ad_count' => random_int(2, 90),
                        ]);
                    }

                    CampaignReport::factory()->create([
                        'realtime_report_id' => $realtime?->id,
                        'date_start' => $date,
                        // IMPORTANT: ownership filter uses accounts.id; campaign_reports.account_id stores that id (string column).
                        'account_id' => (string) $account->id,
                        'account_name' => $account->account_name,
                        'campaign_id' => $campaignId,
                        'campaign_name' => $campaignName,
                        'campaign_status' => ['ACTIVE', 'PAUSED', 'ARCHIVED'][($day + $cIdx) % 3],
                        'ads_type' => $account->ads_type,
                        'style_code' => $style['code'],
                        'style_name' => $style['name'],
                        'channel_code' => $channel['code'],
                        'channel_name' => $channel['name'],
                    ]);
                }
            }
        }
    }

    private function ensureRole(): Role
    {
        $mask = Permission::CampaignReportsView->bit();

        return Role::firstOrCreate(
            ['name' => 'campaign-report-tester'],
            ['permissions' => (string) $mask],
        );
    }

    private function ensureUser(Role $role): User
    {
        return User::firstOrCreate(
            ['email' => 'campaign.report@example.com'],
            [
                'name' => 'Campaign Report Tester',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );
    }

    private function firstOrCreateAccount(
        User $owner,
        string $accountId,
        string $accountName,
        string $adsType,
    ): Account {
        return Account::firstOrCreate(
            ['account_id' => $accountId],
            [
                'account_name' => $accountName,
                'ads_type' => $adsType,
                'status' => 'ACTIVE',
                'created_by' => $owner->id,
            ],
        );
    }
}

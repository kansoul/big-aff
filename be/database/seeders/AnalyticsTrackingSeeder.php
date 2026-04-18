<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\Account;
use App\Models\AdsLink;
use App\Models\Campaign;
use App\Models\EventAdLoad;
use App\Models\InsightReport;
use App\Models\KeywordSet;
use App\Models\LinkData;
use App\Models\Role;
use App\Models\Style;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds dummy data for the Analytics Tracking screen.
 *
 * Ownership chain for EventAdLoad (used in stats/failed-loads):
 *   User → AdsLink (created_by) → LinkData (ads_link_id) → EventAdLoad (link_data_id)
 *
 * Correlation chain (campaign_id ties everything together):
 *   Campaign.campaign_id
 *     = InsightReport.campaign_id   (views + clicks stats)
 *     = LinkData.campaign_id        (joins EventAdLoad to ownership)
 *     = EventAdLoad.campaign_id     (direct filter on failed loads)
 *
 * KeywordSet: owned by users, used for the keyword tracking table.
 */
class AnalyticsTrackingSeeder extends Seeder
{
    private const DAYS = 30;

    private const ACCOUNTS = [
        ['account_id' => 'at_act_fb_0001', 'account_name' => 'Analytics FB Account 1', 'ads_type' => 'facebook'],
        ['account_id' => 'at_act_fb_0002', 'account_name' => 'Analytics FB Account 2', 'ads_type' => 'facebook'],
        ['account_id' => 'at_act_gg_0001', 'account_name' => 'Analytics GG Account 1', 'ads_type' => 'google'],
    ];

    private const STYLES = [
        ['code' => 'at_style_001', 'name' => 'AT Blue Banner'],
        ['code' => 'at_style_002', 'name' => 'AT Red Square'],
        ['code' => 'at_style_003', 'name' => 'AT Green Leaderboard'],
    ];

    private const CHANNELS = [
        ['code' => 'at_chan_tech',     'name' => 'AT Tech Channel'],
        ['code' => 'at_chan_finance',  'name' => 'AT Finance Channel'],
        ['code' => 'at_chan_health',   'name' => 'AT Health Channel'],
    ];

    public function run(): void
    {
        $admin = $this->ensureAdmin();
        $analyst = $this->ensureAnalystUser($admin);

        $styles = $this->ensureStyles($admin);
        $keywordSets = $this->seedKeywordSets($admin, $analyst);

        foreach (self::ACCOUNTS as $def) {
            $account = Account::firstOrCreate(
                ['account_id' => $def['account_id']],
                [
                    'account_name' => $def['account_name'],
                    'ads_type' => $def['ads_type'],
                    'status' => 'ACTIVE',
                    'created_by' => $admin->id,
                ],
            );

            $this->seedCampaignsForAccount($account, $styles, $keywordSets, $admin);
        }

        // Seed data owned by analyst user to verify OwnershipFilter
        $analystAccount = Account::firstOrCreate(
            ['account_id' => 'at_act_analyst_0001'],
            [
                'account_name' => 'Analyst Own Account',
                'ads_type' => 'facebook',
                'status' => 'ACTIVE',
                'created_by' => $analyst->id,
            ],
        );

        $this->seedCampaignsForAccount($analystAccount, $styles, $keywordSets, $analyst);
    }

    // ── Accounts / users ─────────────────────────────────────────────────────

    private function ensureAdmin(): User
    {
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            ['permissions' => (string) Permission::fullMask()],
        );

        if (! $adminRole->wasRecentlyCreated) {
            $adminRole->update(['permissions' => (string) Permission::fullMask()]);
        }

        return User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
            ],
        );
    }

    private function ensureAnalystUser(User $admin): User
    {
        $mask = Permission::AnalyticsTrackingView->bit()
            | Permission::AdsReportView->bit();

        $role = Role::firstOrCreate(
            ['name' => 'analyst'],
            ['permissions' => (string) $mask],
        );

        return User::firstOrCreate(
            ['email' => 'analyst@example.com'],
            [
                'name' => 'Analyst User',
                'password' => Hash::make('password'),
                'role_id' => $role->id,
            ],
        );
    }

    // ── Styles ───────────────────────────────────────────────────────────────

    /**
     * @return list<Style>
     */
    private function ensureStyles(User $owner): array
    {
        return array_map(
            fn ($def) => Style::firstOrCreate(
                ['code' => $def['code']],
                ['name' => $def['name'], 'created_by' => $owner->id],
            ),
            self::STYLES,
        );
    }

    // ── KeywordSets ──────────────────────────────────────────────────────────

    /**
     * @return list<KeywordSet>
     */
    private function seedKeywordSets(User $admin, User $analyst): array
    {
        $definitions = [
            ['name' => 'Buy Intent Keywords',   'keywords' => ['buy now', 'purchase', 'order online', 'best price', 'discount']],
            ['name' => 'Info Keywords',          'keywords' => ['how to', 'tutorial', 'guide', 'learn', 'tips']],
            ['name' => 'Review Keywords',        'keywords' => ['review', 'comparison', 'best', 'top rated', 'vs']],
            ['name' => 'Local Search Keywords',  'keywords' => ['near me', 'local', 'address', 'phone number', 'hours']],
            ['name' => 'Tech Keywords',          'keywords' => ['software', 'app', 'technology', 'digital', 'online tool']],
            ['name' => 'Analyst Keyword Set',    'keywords' => ['analytics', 'tracking', 'metrics', 'data', 'report']],
        ];

        $sets = [];
        foreach ($definitions as $i => $def) {
            $owner = $i < 5 ? $admin : $analyst;

            $sets[] = KeywordSet::firstOrCreate(
                ['name' => $def['name']],
                [
                    'keywords' => $def['keywords'],
                    'created_by' => $owner->id,
                    'updated_by' => $owner->id,
                ],
            );
        }

        return $sets;
    }

    // ── Campaigns ────────────────────────────────────────────────────────────

    /**
     * @param  list<Style>  $styles
     * @param  list<KeywordSet>  $keywordSets
     */
    private function seedCampaignsForAccount(Account $account, array $styles, array $keywordSets, User $owner): void
    {
        $campaignCount = 3;

        for ($c = 1; $c <= $campaignCount; $c++) {
            $campaignId = 'at_camp_'.$account->account_id.'_'.str_pad((string) $c, 2, '0', STR_PAD_LEFT);

            $campaign = Campaign::firstOrCreate(
                ['campaign_id' => $campaignId],
                [
                    'account_id' => $account->account_id,
                    'campaign_name' => 'AT '.ucfirst(fake()->words(3, true)),
                    'ads_type' => $account->ads_type,
                    'daily_budget' => fake()->randomFloat(2, 50, 500),
                    'status' => $c === 3 ? 'PAUSED' : 'ACTIVE',
                    'start_time' => now()->subMonths(2),
                    'created_by' => $owner->id,
                ],
            );

            // Pick a style + channel pair for this campaign
            $styleIndex = ($c - 1) % count(self::STYLES);
            $channelIndex = ($c - 1) % count(self::CHANNELS);
            $style = $styles[$styleIndex];
            $channelCode = self::CHANNELS[$channelIndex]['code'];
            $keywordSet = $keywordSets[($c - 1) % count($keywordSets)];

            $adsLink = $this->ensureAdsLink($campaign, $style, $channelCode, $keywordSet, $owner);
            $linkData = $this->ensureLinkData($adsLink, $campaign, $style, $channelCode, $owner);

            $this->seedInsightReports($campaign);
            $this->seedEventAdLoads($linkData, $campaign->campaign_id);
        }
    }

    // ── AdsLink ──────────────────────────────────────────────────────────────

    private function ensureAdsLink(Campaign $campaign, Style $style, string $channelCode, KeywordSet $keywordSet, User $owner): AdsLink
    {
        $slug = 'at-'.$campaign->campaign_id;

        return AdsLink::firstOrCreate(
            ['slug' => $slug],
            [
                'rac' => 'https://example.com/redirect/'.$campaign->campaign_id,
                'note' => 'Analytics tracking test link for '.$campaign->campaign_name,
                'is_hidden' => false,
                'style_code' => $style->code,
                'channel_code' => $channelCode,
                'keyword_set_id' => $keywordSet->id,
                'created_by' => $owner->id,
                'updated_by' => $owner->id,
            ],
        );
    }

    // ── LinkData ─────────────────────────────────────────────────────────────

    private function ensureLinkData(AdsLink $adsLink, Campaign $campaign, Style $style, string $channelCode, User $owner): LinkData
    {
        $existing = LinkData::where('campaign_id', $campaign->campaign_id)->first();
        if ($existing) {
            return $existing;
        }

        return LinkData::create([
            'ads_link_id' => $adsLink->id,
            'campaign_id' => $campaign->campaign_id,
            'style_code' => $style->code,
            'channel_code' => $channelCode,
            'created_by' => $owner->id,
            'updated_by' => $owner->id,
        ]);
    }

    // ── InsightReport ─────────────────────────────────────────────────────────

    private function seedInsightReports(Campaign $campaign): void
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

    // ── EventAdLoad ───────────────────────────────────────────────────────────

    private function seedEventAdLoads(LinkData $linkData, string $campaignId): void
    {
        // ~5–15 events per day, mixed success + error types
        for ($day = self::DAYS; $day >= 0; $day--) {
            $dayStart = now()->subDays($day)->startOfDay();

            $alreadyExists = EventAdLoad::where('link_data_id', $linkData->id)
                ->whereDate('created_at', $dayStart->toDateString())
                ->exists();

            if ($alreadyExists) {
                continue;
            }

            $total = fake()->numberBetween(5, 15);

            for ($i = 0; $i < $total; $i++) {
                $eventTime = $dayStart->copy()->addSeconds(fake()->numberBetween(0, 86399));

                // ~70% success, ~30% error to give meaningful failed load stats
                $isError = fake()->boolean(30);
                $isSearch = fake()->boolean(50);

                EventAdLoad::factory()
                    ->when($isError && $isSearch, fn ($f) => $f->errorSearch())
                    ->when($isError && ! $isSearch, fn ($f) => $f->errorArticle())
                    ->when(! $isError && $isSearch, fn ($f) => $f->successSearch())
                    ->when(! $isError && ! $isSearch, fn ($f) => $f->successArticle())
                    ->create([
                        'link_data_id' => $linkData->id,
                        'campaign_id' => $campaignId,
                        'event_time' => $eventTime,
                        'created_at' => $eventTime,
                    ]);
            }
        }
    }
}

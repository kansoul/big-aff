<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\AdsLink;
use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\Follow;
use App\Models\LinkData;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Seeds the advertising domain. All cross-table IDs are guaranteed to be consistent:
 *   - `campaigns.account_id`          → `accounts.account_id` (business string)
 *   - `link_datas.campaign_id`        → `campaigns.campaign_id`
 *   - `link_datas.channel_code`       → historical reporting snapshot
 *   - `link_datas.style_code`         → historical reporting snapshot
 */
class AdsSeeder extends Seeder
{
    private const BUSINESS_CENTER_COUNT = 4;

    private const ACCOUNT_COUNT = 10;

    private const CAMPAIGNS_PER_ACCOUNT = 3;

    private const FOLLOW_COUNT = 50;

    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $managers = User::query()
            ->whereIn('email', ['manager1@example.com', 'manager2@example.com'])
            ->get();

        $teams = Team::query()->get();
        $businessCenters = $this->seedBusinessCenters($admin, $teams);

        $accounts = $this->seedAccounts($admin, $managers, $teams, $businessCenters);
        $this->attachAccountsToUsers($accounts, $admin, $managers);

        $campaigns = $this->seedCampaigns($accounts, $admin);

        [, $linkDataList] = $this->seedAdsLinksAndLinkData($campaigns, $admin);

        $this->seedFollows();

        unset($linkDataList);
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @return Collection<int, BusinessCenter>
     */
    private function seedBusinessCenters(User $admin, Collection $teams): Collection
    {
        if (BusinessCenter::query()->count() >= self::BUSINESS_CENTER_COUNT) {
            return BusinessCenter::query()->limit(self::BUSINESS_CENTER_COUNT)->get();
        }

        $missing = self::BUSINESS_CENTER_COUNT - BusinessCenter::query()->count();

        BusinessCenter::factory()
            ->count($missing)
            ->create([
                'team_id' => $teams->isNotEmpty() ? $teams->random()->id : null,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);

        return BusinessCenter::query()->limit(self::BUSINESS_CENTER_COUNT)->get();
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, User>  $managers
     * @param  Collection<int, Team>  $teams
     * @param  Collection<int, BusinessCenter>  $businessCenters
     * @return Collection<int, Account>
     */
    private function seedAccounts(
        User $admin,
        \Illuminate\Database\Eloquent\Collection $managers,
        Collection $teams,
        Collection $businessCenters,
    ): Collection {
        if (Account::query()->count() >= self::ACCOUNT_COUNT) {
            return Account::query()->limit(self::ACCOUNT_COUNT + 2)->get();
        }

        $missing = self::ACCOUNT_COUNT - Account::query()->count();

        Account::factory()
            ->count($missing)
            ->active()
            ->create([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ])
            ->each(function (Account $account) use ($teams, $managers, $businessCenters, $admin): void {
                $owner = $managers->isNotEmpty() ? $managers->random() : $admin;

                $account->update([
                    'team_id' => $teams->isNotEmpty() ? $teams->random()->id : null,
                    'business_center_id' => $businessCenters->isNotEmpty()
                        ? $businessCenters->random()->id
                        : null,
                    'created_by' => $owner->id,
                ]);
            });

        // One admin-owned, team-less Google account (edge case).
        if (! Account::query()->where('ads_type', 'google')->whereNull('team_id')->exists()) {
            Account::factory()->google()->active()->create([
                'team_id' => null,
                'business_center_id' => null,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);
        }

        return Account::query()->limit(self::ACCOUNT_COUNT + 2)->get();
    }

    /**
     * Enforce the domain rule **1 account = 1 user**: each account is pinned to a single
     * owner in `account_user` (its `created_by`), ensuring dashboard rollups attribute
     * each account's spend exactly once.
     *
     * @param  Collection<int, Account>  $accounts
     * @param  \Illuminate\Database\Eloquent\Collection<int, User>  $managers
     */
    private function attachAccountsToUsers(
        Collection $accounts,
        User $admin,
        \Illuminate\Database\Eloquent\Collection $managers,
    ): void {
        unset($managers);

        foreach ($accounts as $account) {
            $ownerId = $account->created_by ?? $admin->id;

            $account->users()->sync([$ownerId]);
        }
    }

    /**
     * @param  Collection<int, Account>  $accounts
     * @return Collection<int, Campaign>
     */
    private function seedCampaigns(Collection $accounts, User $admin): Collection
    {
        if (Campaign::query()->count() >= $accounts->count() * self::CAMPAIGNS_PER_ACCOUNT) {
            return Campaign::query()->with('account')->limit(40)->get();
        }

        foreach ($accounts as $account) {
            $existing = Campaign::query()->where('account_id', $account->account_id)->count();
            if ($existing >= self::CAMPAIGNS_PER_ACCOUNT) {
                continue;
            }

            $needed = self::CAMPAIGNS_PER_ACCOUNT - $existing;

            Campaign::factory()
                ->count($needed)
                ->create([
                    // account_id refers to accounts.account_id (business string), NOT accounts.id
                    'account_id' => $account->account_id,
                    'ads_type' => $account->ads_type,
                    'created_by' => $account->created_by ?? $admin->id,
                    'updated_by' => $account->updated_by ?? $admin->id,
                ]);
        }

        return Campaign::query()->with('account')->limit(40)->get();
    }

    /**
     * Creates one AdsLink + one LinkData per campaign so reports/tracking can join by
     * campaign_id / style_code / channel_code without orphan rows.
     *
     * @param  Collection<int, Campaign>  $campaigns
     * @return array{0: Collection<int, AdsLink>, 1: Collection<int, LinkData>}
     */
    private function seedAdsLinksAndLinkData(
        Collection $campaigns,
        User $admin,
    ): array {
        $adsLinks = collect();
        $linkData = collect();

        foreach ($campaigns as $campaign) {
            $existingLink = LinkData::query()->where('campaign_id', $campaign->campaign_id)->first();
            if ($existingLink !== null) {
                $linkData->push($existingLink);
                $adsLinks->push(AdsLink::query()->find($existingLink->ads_link_id));

                continue;
            }

            $adsLink = AdsLink::factory()->create([
                'rac' => 'https://example.com/redirect/'.$campaign->campaign_id,
                'note' => 'Seed link for '.$campaign->campaign_name,
                'tracking_ids' => $campaign->ads_type === 'tiktok'
                    ? [
                        'tiktokid' => [fake()->numerify('###################')],
                        'tiktok_pixel_id' => [fake()->bothify('C??????????????????')],
                    ]
                    : [
                        'googleid' => [fake()->numerify('##########')],
                    ],
                'created_by' => $campaign->created_by ?? $admin->id,
                'updated_by' => $campaign->updated_by ?? $admin->id,
            ]);

            $link = LinkData::query()->create([
                'ads_link_id' => $adsLink->id,
                // campaign_id references campaigns.campaign_id (business string), unique.
                'campaign_id' => $campaign->campaign_id,
                'style_code' => 'report-style-'.$campaign->campaign_id,
                'channel_code' => 'report-'.$campaign->campaign_id,
                'created_by' => $campaign->created_by ?? $admin->id,
                'updated_by' => $campaign->updated_by ?? $admin->id,
            ]);

            $adsLinks->push($adsLink);
            $linkData->push($link);
        }

        return [$adsLinks, $linkData];
    }

    private function seedFollows(): void
    {
        if (Follow::query()->count() >= self::FOLLOW_COUNT) {
            return;
        }

        $missing = self::FOLLOW_COUNT - Follow::query()->count();

        Follow::factory()
            ->count($missing)
            ->create();
    }
}

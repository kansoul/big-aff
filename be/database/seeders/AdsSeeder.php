<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\KeywordSet;
use App\Models\Link;
use App\Models\MainTeam;
use App\Models\Pixel;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Seeds the advertising domain. All cross-table IDs are guaranteed to be consistent:
 *   - `campaigns.account_id`          → `accounts.account_id` (business string)
 *   - `campaigns.link_id`             → `links.id`
 */
class AdsSeeder extends Seeder
{
    private const BUSINESS_CENTER_COUNT = 1;

    /** TikTok accounts; a single extra Google account is seeded as an edge case. */
    private const ACCOUNT_COUNT = 3;

    private const CAMPAIGNS_PER_ACCOUNT = 1;

    private const PIXEL_COUNT = 2;

    private const KEYWORD_SET_COUNT = 2;

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
        $this->assignMainTeam($accounts);

        $campaigns = $this->seedCampaigns($accounts, $admin);

        $pixels = $this->seedPixels($admin);
        $this->seedKeywordSets($admin);

        $this->assignLinks($campaigns);

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
            return Account::query()->limit(self::ACCOUNT_COUNT + 1)->get();
        }

        $missing = self::ACCOUNT_COUNT - Account::query()->count();

        Account::factory()
            ->count($missing)
            ->tiktok()
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

        return Account::query()->limit(self::ACCOUNT_COUNT + 1)->get();
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
     * Points every account at the seeded main team so `accounts.main_team_id` — and the
     * owner columns backfilled onto the report tables — are populated.
     *
     * @param  Collection<int, Account>  $accounts
     */
    private function assignMainTeam(Collection $accounts): void
    {
        $mainTeamId = MainTeam::query()->value('id');

        if ($mainTeamId === null) {
            return;
        }

        foreach ($accounts as $account) {
            if ($account->main_team_id === null) {
                $account->update(['main_team_id' => $mainTeamId]);
            }
        }
    }

    /**
     * @return Collection<int, Pixel>
     */
    private function seedPixels(User $admin): Collection
    {
        $missing = self::PIXEL_COUNT - Pixel::query()->count();

        if ($missing > 0) {
            Pixel::factory()->count($missing)->create([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);
        }

        return Pixel::query()->limit(self::PIXEL_COUNT)->get();
    }

    private function seedKeywordSets(User $admin): void
    {
        $missing = self::KEYWORD_SET_COUNT - KeywordSet::query()->count();

        if ($missing <= 0) {
            return;
        }

        KeywordSet::factory()->count($missing)->create([
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
    }

    /**
     * @param  Collection<int, Account>  $accounts
     * @return Collection<int, Campaign>
     */
    private function seedCampaigns(Collection $accounts, User $admin): Collection
    {
        if (Campaign::query()->count() >= $accounts->count() * self::CAMPAIGNS_PER_ACCOUNT) {
            return Campaign::query()->with('account')->limit(20)->get();
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

        return Campaign::query()->with('account')->limit(20)->get();
    }

    /** @param Collection<int, Campaign> $campaigns */
    private function assignLinks(Collection $campaigns): void
    {
        $links = Link::query()->get();
        foreach ($campaigns as $campaign) {
            if ($campaign->link_id !== null || $links->isEmpty()) {
                continue;
            }
            $campaign->update(['link_id' => $links->random()->id]);
        }
    }
}

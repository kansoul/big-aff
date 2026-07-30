<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\AdsLink;
use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\Channel;
use App\Models\ChannelUser;
use App\Models\Follow;
use App\Models\KeywordSet;
use App\Models\LinkData;
use App\Models\Post;
use App\Models\Site;
use App\Models\Style;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Seeds the advertising domain. All cross-table IDs are guaranteed to be consistent:
 *   - `campaigns.account_id`          → `accounts.account_id` (business string)
 *   - `ads_links.channel_code`        → `channels.code`
 *   - `ads_links.style_code`          → `styles.code`
 *   - `link_datas.campaign_id`        → `campaigns.campaign_id`
 *   - `link_datas.channel_code`       → `channels.code`
 *   - `link_datas.style_code`         → `styles.code`
 *   - `follows.style_code/channel_code` → real style/channel codes
 *
 * `channel_user` is only populated for users who are **leader** or **member** on a team so
 * revenue rollups (which join through `channel_user`) exclude admin and managers.
 */
class AdsSeeder extends Seeder
{
    private const STYLE_COUNT = 10;

    private const CHANNEL_COUNT = 12;

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
        $sites = Site::query()->limit(10)->get();
        $posts = Post::query()->limit(30)->get();
        $keywordSets = KeywordSet::query()->limit(15)->get();

        $styles = $this->seedStyles($admin);
        $channels = $this->seedChannels($admin);
        $this->attachChannelsToLeaderAndMemberUsers($channels);

        $businessCenters = $this->seedBusinessCenters($admin, $teams);

        $accounts = $this->seedAccounts($admin, $managers, $teams, $businessCenters);
        $this->attachAccountsToUsers($accounts, $admin, $managers);

        $campaigns = $this->seedCampaigns($accounts, $admin);

        [$adsLinks, $linkDataList] = $this->seedAdsLinksAndLinkData(
            $campaigns,
            $styles,
            $channels,
            $keywordSets,
            $sites,
            $posts,
            $admin,
        );

        $this->seedFollows($sites, $posts, $adsLinks, $styles, $channels);

        unset($linkDataList);
    }

    /**
     * @return Collection<int, Style>
     */
    private function seedStyles(User $admin): Collection
    {
        if (Style::query()->count() >= self::STYLE_COUNT) {
            return Style::query()->limit(self::STYLE_COUNT)->get();
        }

        $missing = self::STYLE_COUNT - Style::query()->count();

        Style::factory()
            ->count($missing)
            ->create()
            ->each(function (Style $style) use ($admin): void {
                $style->update(['created_by' => $admin->id, 'updated_by' => $admin->id]);
            });

        return Style::query()->limit(self::STYLE_COUNT)->get();
    }

    /**
     * @return Collection<int, Channel>
     */
    private function seedChannels(User $admin): Collection
    {
        if (Channel::query()->count() >= self::CHANNEL_COUNT) {
            return Channel::query()->limit(self::CHANNEL_COUNT)->get();
        }

        $missing = self::CHANNEL_COUNT - Channel::query()->count();

        Channel::factory()
            ->count($missing)
            ->create()
            ->each(function (Channel $channel) use ($admin): void {
                $channel->update(['created_by' => $admin->id, 'updated_by' => $admin->id]);
            });

        return Channel::query()->limit(self::CHANNEL_COUNT)->get();
    }

    /**
     * Enforce the domain rule **1 channel = 1 user**:
     * each channel is owned by exactly one leader/member user, distributed round-robin
     * across all leader/member users so dashboard revenue attributes cleanly per team.
     *
     * @param  Collection<int, Channel>  $channels
     */
    private function attachChannelsToLeaderAndMemberUsers(Collection $channels): void
    {
        if ($channels->isEmpty()) {
            return;
        }

        $revenueUserIds = TeamUser::query()
            ->whereIn('team_role', [TeamRole::LEADER, TeamRole::MEMBER])
            ->pluck('user_id')
            ->unique()
            ->values()
            ->all();

        if ($revenueUserIds === []) {
            return;
        }

        // Reset the pivot (hard delete — unique index on (user_id, channel_id) ignores soft-deletes)
        // so the 1-channel-per-user rule is applied idempotently.
        ChannelUser::query()->whereIn('channel_id', $channels->pluck('id'))->forceDelete();

        foreach ($channels->values() as $index => $channel) {
            $userId = $revenueUserIds[$index % count($revenueUserIds)];

            ChannelUser::query()->create([
                'user_id' => $userId,
                'channel_id' => $channel->id,
            ]);
        }
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

        // One admin-owned, team-less Facebook account (edge case).
        if (! Account::query()->where('ads_type', 'facebook')->whereNull('team_id')->exists()) {
            Account::factory()->facebook()->active()->create([
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
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     * @param  Collection<int, KeywordSet>  $keywordSets
     * @param  Collection<int, Site>  $sites
     * @param  Collection<int, Post>  $posts
     * @return array{0: Collection<int, AdsLink>, 1: Collection<int, LinkData>}
     */
    private function seedAdsLinksAndLinkData(
        Collection $campaigns,
        Collection $styles,
        Collection $channels,
        Collection $keywordSets,
        Collection $sites,
        Collection $posts,
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

            $style = $styles->random();
            $channel = $channels->random();
            $keywordSet = $keywordSets->isNotEmpty() ? $keywordSets->random() : null;
            $site = $sites->isNotEmpty() ? $sites->random() : null;
            $post = $posts->isNotEmpty() ? $posts->random() : null;

            $adsLink = AdsLink::factory()->create([
                'site_id' => $site?->id,
                'post_id' => $post?->id,
                'rac' => 'https://example.com/redirect/'.$campaign->campaign_id,
                'note' => 'Seed link for '.$campaign->campaign_name,
                'style_code' => $style->code,
                'channel_code' => $channel->code,
                'keyword_set_id' => $keywordSet?->id,
                'tracking_ids' => [
                    'fb_id' => fake()->numerify('##########'),
                    'customer_id' => fake()->numerify('##########'),
                ],
                'created_by' => $campaign->created_by ?? $admin->id,
                'updated_by' => $campaign->updated_by ?? $admin->id,
            ]);

            $link = LinkData::query()->create([
                'ads_link_id' => $adsLink->id,
                // campaign_id references campaigns.campaign_id (business string), unique.
                'campaign_id' => $campaign->campaign_id,
                'style_code' => $style->code,
                'channel_code' => $channel->code,
                'created_by' => $campaign->created_by ?? $admin->id,
                'updated_by' => $campaign->updated_by ?? $admin->id,
            ]);

            $adsLinks->push($adsLink);
            $linkData->push($link);
        }

        return [$adsLinks, $linkData];
    }

    /**
     * @param  Collection<int, Site>  $sites
     * @param  Collection<int, Post>  $posts
     * @param  Collection<int, AdsLink>  $adsLinks
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     */
    private function seedFollows(
        Collection $sites,
        Collection $posts,
        Collection $adsLinks,
        Collection $styles,
        Collection $channels,
    ): void {
        if (Follow::query()->count() >= self::FOLLOW_COUNT) {
            return;
        }

        // Unused $sites/$adsLinks reference — site_id and ads_link_id were removed by the
        // 2026_04_14 migration, so follows only carry email/post_id/style/channel snapshots.
        unset($sites, $adsLinks);

        $missing = self::FOLLOW_COUNT - Follow::query()->count();

        Follow::factory()
            ->count($missing)
            ->state(fn () => [
                'post_id' => $posts->isNotEmpty() ? $posts->random()->id : null,
                'style_code' => $styles->isNotEmpty() ? $styles->random()->code : null,
                'channel_code' => $channels->isNotEmpty() ? $channels->random()->code : null,
            ])
            ->create();
    }
}

<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\AdClient;
use App\Models\AdsLink;
use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\Channel;
use App\Models\KeywordSet;
use App\Models\LinkData;
use App\Models\Style;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class AdsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $managers = User::query()->whereIn('email', ['manager1@example.com', 'manager2@example.com'])->get();

        $teams = Team::query()->limit(5)->get();

        $styles = $this->seedStyles($admin, $managers);
        $channels = $this->seedChannels($admin, $managers);
        $keywordSets = KeywordSet::query()->limit(15)->get();

        if (! $keywordSets->count()) {
            $keywordSets = KeywordSet::factory()->count(15)->create([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]);
        }

        if (! AdClient::query()->exists()) {
            AdClient::factory()->count(5)->create();
        }

        if (! BusinessCenter::query()->exists()) {
            BusinessCenter::factory()->count(4)->create([
                'created_by' => $admin->id,
            ]);
        }

        $accounts = $this->seedAccounts($admin, $managers, $teams);
        $this->attachAccountUsers($accounts, $admin, $managers);

        $campaigns = $this->seedCampaigns($accounts, $admin);
        $this->seedAdsLinksAndLinkData($campaigns, $styles, $channels, $keywordSets, $admin);
    }

    /**
     * @return Collection<int, Style>
     */
    private function seedStyles(User $admin, Collection $managers): Collection
    {
        if (Style::query()->exists()) {
            return Style::query()->limit(10)->get();
        }

        $owners = $managers->push($admin)->values();

        return Style::factory()
            ->count(10)
            ->create()
            ->each(function (Style $style) use ($owners) {
                $owner = $owners->random();
                $style->update(['created_by' => $owner->id, 'updated_by' => $owner->id]);
            });
    }

    /**
     * @return Collection<int, Channel>
     */
    private function seedChannels(User $admin, Collection $managers): Collection
    {
        if (Channel::query()->exists()) {
            return Channel::query()->limit(12)->get();
        }

        $owners = $managers->push($admin)->values();

        $channels = Channel::factory()
            ->count(12)
            ->create()
            ->each(function (Channel $channel) use ($owners) {
                $owner = $owners->random();
                $channel->update(['created_by' => $owner->id, 'updated_by' => $owner->id]);
            });

        foreach ($owners as $owner) {
            $owner->channels()->syncWithoutDetaching($channels->random(4)->pluck('id')->all());
        }

        return $channels;
    }

    /**
     * @return Collection<int, Account>
     */
    private function seedAccounts(User $admin, Collection $managers, Collection $teams): Collection
    {
        if (Account::query()->exists()) {
            return Account::query()->limit(12)->get();
        }

        $accounts = Account::factory()
            ->count(10)
            ->active()
            ->create([
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ])
            ->each(function (Account $account) use ($teams, $managers) {
                $team = $teams->count() ? $teams->random() : null;
                $owner = $managers->count() ? $managers->random() : null;

                $account->update([
                    'team_id' => $team?->id,
                    'created_by' => $owner?->id ?? $account->created_by,
                ]);
            });

        // One admin-owned no-team account (edge case)
        Account::factory()->facebook()->active()->create([
            'team_id' => null,
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);

        return Account::query()->limit(12)->get();
    }

    private function attachAccountUsers(Collection $accounts, User $admin, Collection $managers): void
    {
        foreach ($accounts as $account) {
            $ownerId = $account->created_by ?? $admin->id;
            $account->users()->syncWithoutDetaching([$ownerId]);
        }
    }

    /**
     * @return Collection<int, Campaign>
     */
    private function seedCampaigns(Collection $accounts, User $admin): Collection
    {
        if (Campaign::query()->exists()) {
            return Campaign::query()->limit(30)->get();
        }

        $campaigns = collect();

        foreach ($accounts as $account) {
            $campaigns = $campaigns->merge(
                Campaign::factory()
                    ->count(3)
                    ->create([
                        'account_id' => $account->account_id,
                        'ads_type' => $account->ads_type,
                        'created_by' => $account->created_by ?? $admin->id,
                        'updated_by' => $account->updated_by ?? $admin->id,
                    ]),
            );
        }

        return $campaigns;
    }

    /**
     * Create AdsLink + LinkData per campaign so analytics/tracking/report screens
     * can join by `campaign_id` and ownership (`ads_links.created_by`).
     *
     * @param  Collection<int, Campaign>  $campaigns
     * @param  Collection<int, Style>  $styles
     * @param  Collection<int, Channel>  $channels
     * @param  Collection<int, KeywordSet>  $keywordSets
     */
    private function seedAdsLinksAndLinkData(
        Collection $campaigns,
        Collection $styles,
        Collection $channels,
        Collection $keywordSets,
        User $admin,
    ): void {
        if (AdsLink::query()->exists() && LinkData::query()->exists()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            $style = $styles->random();
            $channel = $channels->random();
            $keywordSet = $keywordSets->random();

            $adsLink = AdsLink::factory()->create([
                'rac' => 'https://example.com/redirect/'.$campaign->campaign_id,
                'note' => 'Seed link for '.$campaign->campaign_name,
                'style_code' => $style->code,
                'channel_code' => $channel->code,
                'keyword_set_id' => $keywordSet->id,
                'created_by' => $campaign->created_by ?? $admin->id,
                'updated_by' => $campaign->updated_by ?? $admin->id,
            ]);

            LinkData::query()->firstOrCreate(
                ['campaign_id' => $campaign->campaign_id],
                [
                    'ads_link_id' => $adsLink->id,
                    'style_code' => $style->code,
                    'channel_code' => $channel->code,
                    'created_by' => $campaign->created_by ?? $admin->id,
                    'updated_by' => $campaign->updated_by ?? $admin->id,
                ],
            );
        }
    }
}

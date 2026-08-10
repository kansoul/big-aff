<?php

namespace Database\Seeders;

use App\Enums\EntityTypeEnum;
use App\Models\Account;
use App\Models\AdsConversion;
use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\Conversion;
use App\Models\Gtag;
use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Seeds rule / conversion / schedule tables using the real users, campaigns, and
 * accounts produced by previous seeders. Guarantees:
 *   - user_campaign_rule_settings covers every seeded user (exactly once per user)
 *   - campaign_rules are owned by admin/managers
 *   - campaign_apply_rules references real campaign ids
 *   - conversions.account_id        → accounts.account_id (string, per migration)
 *   - ads_conversions.account_id    → accounts.account_id (string, same contract)
 *   - campaign_schedule_items.campaign_id → campaigns.campaign_id
 */
class RulesSeeder extends Seeder
{
    private const CONVERSION_COUNT = 3;

    private const ADS_CONVERSION_COUNT = 3;

    private const GTAG_COUNT = 1;

    /** Campaigns wired into apply-rules / schedules. */
    private const CAMPAIGN_LIMIT = 4;

    /** Campaign rules attached to each campaign. */
    private const RULES_PER_CAMPAIGN = 1;

    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $ruleOwners = User::query()
            ->whereIn('email', ['admin@example.com', 'manager1@example.com', 'manager2@example.com'])
            ->get();

        $this->seedUserCampaignRuleSettings();
        $this->seedCampaignRules($ruleOwners);
        $this->seedCampaignApplyRules();
        $this->seedConversions();
        $this->seedAdsConversions();
        $this->seedGtags();
        $this->seedCampaignSchedules($admin);
    }

    /**
     * One preference row per user — avoids unique-user insert conflicts.
     */
    private function seedUserCampaignRuleSettings(): void
    {
        $missingUserIds = User::query()
            ->whereNotIn('id', UserCampaignRuleSetting::query()->select('user_id'))
            ->pluck('id');

        foreach ($missingUserIds as $userId) {
            UserCampaignRuleSetting::factory()->create(['user_id' => $userId]);
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, User>  $owners
     */
    private function seedCampaignRules(\Illuminate\Database\Eloquent\Collection $owners): void
    {
        if (CampaignRule::query()->exists() || $owners->isEmpty()) {
            return;
        }

        foreach ($owners as $owner) {
            CampaignRule::factory()->count(1)->forCampaign()->active()->create(['user_id' => $owner->id]);
            CampaignRule::factory()->count(1)->forAdAdset()->active()->create(['user_id' => $owner->id]);
        }

        // One inactive + one expired rule so those states are still representable.
        $firstOwner = $owners->first();
        CampaignRule::factory()->count(1)->forCampaign()->inactive()->create(['user_id' => $firstOwner->id]);
        CampaignRule::factory()->count(1)->forCampaign()->expired()->create(['user_id' => $firstOwner->id]);
    }

    private function seedCampaignApplyRules(): void
    {
        if (CampaignApplyRule::query()->exists()) {
            return;
        }

        $campaigns = Campaign::query()->limit(self::CAMPAIGN_LIMIT)->get();
        $campaignRules = CampaignRule::query()
            ->where('entity_type', EntityTypeEnum::Campaign->value)
            ->where('is_active', true)
            ->get();

        if ($campaigns->isEmpty() || $campaignRules->isEmpty()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            foreach ($campaignRules->random(min(self::RULES_PER_CAMPAIGN, $campaignRules->count())) as $rule) {
                CampaignApplyRule::query()->firstOrCreate([
                    'campaign_rule_id' => $rule->id,
                    'sourceable_type' => Campaign::class,
                    'sourceable_id' => (int) $campaign->campaign_id,
                ]);
            }
        }
    }

    private function seedConversions(): void
    {
        if (Conversion::query()->exists()) {
            return;
        }

        /** @var Collection<int, string> $accountIds */
        $accountIds = Account::query()->pluck('account_id');
        if ($accountIds->isEmpty()) {
            return;
        }

        Conversion::factory()
            ->count(self::CONVERSION_COUNT)
            ->state(fn () => [
                // accounts.account_id (string) per change_constrained_for_conversions migration.
                'account_id' => $accountIds->random(),
            ])
            ->create();
    }

    private function seedAdsConversions(): void
    {
        if (AdsConversion::query()->exists()) {
            return;
        }

        $campaigns = Campaign::query()->get(['account_id', 'campaign_id']);
        if ($campaigns->isEmpty()) {
            return;
        }

        AdsConversion::factory()
            ->count(self::ADS_CONVERSION_COUNT)
            ->state(function () use ($campaigns): array {
                $campaign = $campaigns->random();

                return [
                    'account_id' => $campaign->account_id,
                    'campaign_id' => $campaign->campaign_id,
                ];
            })
            ->create();
    }

    private function seedGtags(): void
    {
        if (Gtag::query()->exists()) {
            return;
        }

        // Gtags only surface for google accounts with gtag_enabled = true.
        $accounts = Account::query()
            ->where('ads_type', 'google')
            ->inRandomOrder()
            ->limit(self::GTAG_COUNT)
            ->get();

        if ($accounts->isEmpty()) {
            return;
        }

        $accounts->each->update(['gtag_enabled' => true]);

        $accounts->each(function (Account $account): void {
            Gtag::factory()
                ->state(['account_id' => $account->account_id])
                ->create();
        });
    }

    private function seedCampaignSchedules(User $admin): void
    {
        if (! Schema::hasTable('campaign_schedules') || ! Schema::hasTable('campaign_schedule_items')) {
            return;
        }

        if (DB::table('campaign_schedules')->exists()) {
            return;
        }

        $schedule1Id = DB::table('campaign_schedules')->insertGetId([
            'created_by' => $admin->id,
            'name' => 'Weekday schedule',
            'turn_on_time' => '08:00:00',
            'turn_off_time' => '20:00:00',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $schedule2Id = DB::table('campaign_schedules')->insertGetId([
            'created_by' => $admin->id,
            'name' => 'Night schedule',
            'turn_on_time' => '20:00:00',
            'turn_off_time' => '06:00:00',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $campaignIds = Campaign::query()->limit(self::CAMPAIGN_LIMIT)->pluck('campaign_id')->all();
        if (count($campaignIds) === 0) {
            return;
        }

        $half = (int) ceil(count($campaignIds) / 2);

        foreach (array_slice($campaignIds, 0, $half) as $campaignId) {
            DB::table('campaign_schedule_items')->insertOrIgnore([
                'campaign_schedule_id' => $schedule1Id,
                'campaign_id' => $campaignId,
            ]);
        }

        foreach (array_slice($campaignIds, $half) as $campaignId) {
            DB::table('campaign_schedule_items')->insertOrIgnore([
                'campaign_schedule_id' => $schedule2Id,
                'campaign_id' => $campaignId,
            ]);
        }
    }
}

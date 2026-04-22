<?php

namespace Database\Seeders;

use App\Models\AdsConversion;
use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\Conversion;
use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RulesSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@example.com')->firstOrFail();

        if (! UserCampaignRuleSetting::query()->exists()) {
            UserCampaignRuleSetting::factory()->create([
                'user_id' => $admin->id,
            ]);

            User::query()
                ->where('id', '!=', $admin->id)
                ->limit(10)
                ->get()
                ->each(fn (User $user) => UserCampaignRuleSetting::factory()->create(['user_id' => $user->id]));
        }

        if (! CampaignRule::query()->exists()) {
            CampaignRule::factory()->count(8)->forCampaign()->active()->create(['user_id' => $admin->id]);
            CampaignRule::factory()->count(5)->forAdAdset()->active()->create(['user_id' => $admin->id]);
            CampaignRule::factory()->forCampaign()->inactive()->create(['user_id' => $admin->id]);
            CampaignRule::factory()->forCampaign()->expired()->create(['user_id' => $admin->id]);
        }

        if (! CampaignApplyRule::query()->exists()) {
            $campaigns = Campaign::query()->limit(15)->get();
            $rules = CampaignRule::query()->where('user_id', $admin->id)->get();

            foreach ($campaigns as $campaign) {
                foreach ($rules->random(min(3, $rules->count())) as $rule) {
                    CampaignApplyRule::query()->firstOrCreate([
                        'campaign_rule_id' => $rule->id,
                        'sourceable_type' => Campaign::class,
                        'sourceable_id' => $campaign->id,
                    ]);
                }
            }
        }

        if (! Conversion::query()->exists()) {
            Conversion::factory()->count(50)->create();
        }

        if (! AdsConversion::query()->exists()) {
            AdsConversion::factory()->count(80)->create();
        }

        $this->seedCampaignSchedules($admin);
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

        $campaignIds = Campaign::query()->limit(20)->pluck('campaign_id')->all();
        if (! count($campaignIds)) {
            return;
        }

        foreach (array_slice($campaignIds, 0, 10) as $campaignId) {
            DB::table('campaign_schedule_items')->insertOrIgnore([
                'campaign_schedule_id' => $schedule1Id,
                'campaign_id' => $campaignId,
            ]);
        }

        foreach (array_slice($campaignIds, 10, 10) as $campaignId) {
            DB::table('campaign_schedule_items')->insertOrIgnore([
                'campaign_schedule_id' => $schedule2Id,
                'campaign_id' => $campaignId,
            ]);
        }
    }
}

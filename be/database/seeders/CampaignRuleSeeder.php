<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\User;
use Illuminate\Database\Seeder;

class CampaignRuleSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->first();

        if (! $user) {
            $this->command->warn('No users found. Run CreateUserSeeder first.');

            return;
        }

        // Campaign-level rules
        CampaignRule::factory()->count(5)->forCampaign()->active()->create(['user_id' => $user->id]);

        // Ad/Adset-level rules
        CampaignRule::factory()->count(3)->forAdAdset()->active()->create(['user_id' => $user->id]);

        // Inactive rule
        CampaignRule::factory()->forCampaign()->inactive()->create(['user_id' => $user->id]);

        // Expired rule
        CampaignRule::factory()->forCampaign()->expired()->create(['user_id' => $user->id]);

        // Attach rules to existing campaigns
        $campaigns = Campaign::query()->where('created_by', $user->id)->limit(10)->get();
        $rules = CampaignRule::query()->where('user_id', $user->id)->get();

        if ($campaigns->isNotEmpty() && $rules->isNotEmpty()) {
            foreach ($campaigns->take(5) as $campaign) {
                $rule = $rules->random();

                CampaignApplyRule::firstOrCreate([
                    'campaign_rule_id' => $rule->id,
                    'sourceable_type' => Campaign::class,
                    'sourceable_id' => $campaign->id,
                ]);
            }
        }

        $this->command->info('CampaignRule seeder completed.');
    }
}

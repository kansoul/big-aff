<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CampaignApplyRule>
 */
class CampaignApplyRuleFactory extends Factory
{
    protected $model = CampaignApplyRule::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'campaign_rule_id' => CampaignRule::factory(),
            'sourceable_type' => Campaign::class,
            'sourceable_id' => Campaign::factory(),
        ];
    }
}

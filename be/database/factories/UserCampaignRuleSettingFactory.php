<?php

namespace Database\Factories;

use App\Enums\RuleActionMode;
use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserCampaignRuleSetting>
 */
class UserCampaignRuleSettingFactory extends Factory
{
    protected $model = UserCampaignRuleSetting::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'campaign_rule_auto_enabled' => true,
            'action_mode' => fake()->randomElement(RuleActionMode::cases()),
            'telegram_chat_id' => fake()->optional(0.4)->numerify('##########'),
        ];
    }
}

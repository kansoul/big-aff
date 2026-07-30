<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Account>
 */
class AccountFactory extends Factory
{
    protected $model = Account::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $adsType = fake()->randomElement(['google', 'tiktok']);

        return [
            'account_id' => ($adsType === 'tiktok' ? 'tt_' : 'goog_').fake()->unique()->numerify('##########'),
            'account_name' => fake()->company().' Ads',
            'ads_type' => $adsType,
            'status' => fake()->randomElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'DIE']),
            'is_special' => false,
            'sync_to_mcc' => false,
            'business_center_id' => null,
            'team_id' => null,
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }

    public function google(): static
    {
        return $this->state(fn () => [
            'ads_type' => 'google',
            'account_id' => 'goog_'.fake()->unique()->numerify('##########'),
        ]);
    }

    public function tiktok(): static
    {
        return $this->state(fn () => [
            'ads_type' => 'tiktok',
            'account_id' => 'tt_'.fake()->unique()->numerify('##########'),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'ACTIVE']);
    }
}

<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserTablePreference;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserTablePreference>
 */
class UserTablePreferenceFactory extends Factory
{
    protected $model = UserTablePreference::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'table_name' => fake()->randomElement(['style-report-range', 'revenue-reports', 'campaign-reports']),
            'toggled_columns' => [],
            'additional_settings' => [],
        ];
    }

    public function forRevenueReportRange(): static
    {
        return $this->state([
            'table_name' => 'style-report-range',
            'toggled_columns' => [],
            'additional_settings' => [
                'filters' => [
                    'ranges_filter' => [
                        'ranges' => [],
                    ],
                ],
            ],
        ]);
    }
}

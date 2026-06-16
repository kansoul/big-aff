<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Gtag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Gtag>
 */
class GtagFactory extends Factory
{
    protected $model = Gtag::class;

    public function definition(): array
    {
        return [
            'account_id' => function () {
                $account = Account::query()->inRandomOrder()->first();
                if ($account) {
                    return $account->account_id;
                }

                return Account::factory()->create()->account_id;
            },
            'code' => fake()->optional(0.8)->numerify('AW-##########'),
            'article_view' => fake()->optional(0.8)->bothify('av_##########'),
            'rsu_click' => fake()->optional(0.8)->bothify('rc_##########'),
            'search_view' => fake()->optional(0.8)->bothify('sv_##########'),
            'search_click' => fake()->optional(0.8)->bothify('sc_##########'),
        ];
    }
}

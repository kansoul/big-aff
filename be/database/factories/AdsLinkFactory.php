<?php

namespace Database\Factories;

use App\Models\AdsLink;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AdsLink>
 */
class AdsLinkFactory extends Factory
{
    protected $model = AdsLink::class;

    public function definition(): array
    {
        return [
            'site_id' => null,
            'slug' => Str::random(10).'-'.fake()->numerify('####'),
            'rac' => fake()->url(),
            'note' => fake()->optional(0.4)->sentence(),
            'is_hidden' => false,
            'tracking_ids' => null,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}

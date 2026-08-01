<?php

namespace Database\Factories;

use App\Models\LinkData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkData>
 */
class LinkDataFactory extends Factory
{
    protected $model = LinkData::class;

    public function definition(): array
    {
        return [
            'ads_link_id' => null,
            'campaign_id' => fake()->numerify('##############'),
            'style_code' => null,
            'channel_code' => null,
        ];
    }
}

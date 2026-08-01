<?php

namespace Database\Factories;

use App\Enums\EventClickType;
use App\Enums\EventPage;
use App\Models\EventClick;
use App\Models\LinkData;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventClick>
 */
class EventClickFactory extends Factory
{
    protected $model = EventClick::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $eventTime = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'session_id' => fake()->uuid(),
            'link_data_id' => LinkData::factory(),
            'campaign_id' => fake()->optional(0.8)->numerify('##############'),
            'adset_id' => fake()->optional(0.6)->bothify('adset_##########'),
            'ad_id' => fake()->optional(0.6)->bothify('ad_##########'),
            'type' => fake()->randomElement(EventClickType::cases()),
            'page' => fake()->randomElement(EventPage::cases()),
            'keyword_clicked' => fake()->optional(0.7)->sentence(3),
            'event_time' => $eventTime,
            'created_at' => $eventTime,
        ];
    }
}

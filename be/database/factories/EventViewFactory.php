<?php

namespace Database\Factories;

use App\Enums\EventPage;
use App\Enums\EventViewType;
use App\Models\EventView;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventView>
 */
class EventViewFactory extends Factory
{
    protected $model = EventView::class;

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
            'campaign_id' => fake()->numerify('##############'),
            'adset_id' => fake()->optional(0.6)->bothify('adset_##########'),
            'ad_id' => fake()->optional(0.6)->bothify('ad_##########'),
            'type' => fake()->randomElement(EventViewType::cases()),
            'page' => fake()->randomElement(EventPage::cases()),
            'query' => fake()->optional(0.7)->sentence(3),
            'event_time' => $eventTime,
            'created_at' => $eventTime,
        ];
    }
}

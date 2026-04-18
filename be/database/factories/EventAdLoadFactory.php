<?php

namespace Database\Factories;

use App\Enums\EventAdLoadType;
use App\Models\EventAdLoad;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventAdLoad>
 */
class EventAdLoadFactory extends Factory
{
    protected $model = EventAdLoad::class;

    public function definition(): array
    {
        $type = fake()->randomElement(EventAdLoadType::cases());
        $eventTime = fake()->dateTimeBetween('-30 days', 'now');

        return [
            'session_id' => fake()->uuid(),
            'link_data_id' => null,
            'campaign_id' => null,
            'adset_id' => 'adset_'.fake()->numerify('##########'),
            'ad_id' => 'ad_'.fake()->numerify('##########'),
            'type' => $type,
            'container_type' => fake()->randomElement(['search', 'article']),
            'load_time_ms' => fake()->numberBetween(50, 3000),
            'ad_loaded' => in_array($type, [EventAdLoadType::SuccessSearch, EventAdLoadType::SuccessArticle]),
            'event_time' => $eventTime,
            'created_at' => $eventTime,
        ];
    }

    public function errorSearch(): static
    {
        return $this->state(['type' => EventAdLoadType::ErrorSearch, 'ad_loaded' => false]);
    }

    public function errorArticle(): static
    {
        return $this->state(['type' => EventAdLoadType::ErrorArticle, 'ad_loaded' => false]);
    }

    public function successSearch(): static
    {
        return $this->state(['type' => EventAdLoadType::SuccessSearch, 'ad_loaded' => true]);
    }

    public function successArticle(): static
    {
        return $this->state(['type' => EventAdLoadType::SuccessArticle, 'ad_loaded' => true]);
    }
}

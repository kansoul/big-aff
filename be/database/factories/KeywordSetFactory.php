<?php

namespace Database\Factories;

use App\Models\KeywordSet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KeywordSet>
 */
class KeywordSetFactory extends Factory
{
    protected $model = KeywordSet::class;

    private static array $sampleKeywordPools = [
        ['buy online', 'best deals', 'cheap prices', 'free shipping', 'discount code'],
        ['how to', 'tutorial', 'guide', 'tips', 'step by step'],
        ['review', 'comparison', 'best', 'top rated', 'recommended'],
        ['near me', 'local', 'city', 'store', 'service'],
        ['news', 'latest', 'update', 'breaking', 'today'],
    ];

    public function definition(): array
    {
        $pool = fake()->randomElement(self::$sampleKeywordPools);
        $count = fake()->numberBetween(2, count($pool));
        $keywords = array_slice(fake()->shuffle($pool), 0, $count);

        return [
            'name' => ucfirst(fake()->words(fake()->numberBetween(2, 4), true)) . ' Keywords',
            'keywords' => $keywords,
            'created_by' => null,
            'updated_by' => null,
        ];
    }
}

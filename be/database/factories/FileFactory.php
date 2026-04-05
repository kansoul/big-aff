<?php

namespace Database\Factories;

use App\Models\File;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<File>
 */
class FileFactory extends Factory
{
    protected $model = File::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'disk' => 'public',
            'file_name' => fake()->uuid().'.png',
            'original_name' => 'image.png',
            'mime_type' => 'image/png',
            'size' => fake()->numberBetween(1000, 500_000),
            'path' => 'uploads/'.fake()->uuid().'.png',
            'alt_text' => null,
        ];
    }
}

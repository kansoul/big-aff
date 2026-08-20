<?php

namespace Database\Seeders;

use App\Models\Link;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LinksSeeder extends Seeder
{
    public function run(): void
    {
        Link::query()->firstOrCreate(['url' => 'https://example.com'], [
            'name' => 'Example landing page',
            'tracking_code' => Str::random(32),
            'status' => 'active',
        ]);
    }
}

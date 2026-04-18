<?php

namespace Database\Seeders;

use App\Models\RevenueReport;
use Illuminate\Database\Seeder;

class RevenueReportSeeder extends Seeder
{
    public function run(): void
    {
        RevenueReport::factory(200)->create();
    }
}

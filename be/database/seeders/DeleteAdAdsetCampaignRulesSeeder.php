<?php

namespace Database\Seeders;

use App\Enums\EntityTypeEnum;
use App\Models\CampaignRule;
use Illuminate\Database\Seeder;

class DeleteAdAdsetCampaignRulesSeeder extends Seeder
{
    public function run(): void
    {
        $deleted = CampaignRule::where('entity_type', EntityTypeEnum::AdAdset)->delete();

        $this->command->info("Deleted {$deleted} campaign rule(s) with entity_type = ad_adset.");
    }
}

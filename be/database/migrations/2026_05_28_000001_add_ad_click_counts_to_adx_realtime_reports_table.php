<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adx_realtime_reports', function (Blueprint $table): void {
            $table->unsignedBigInteger('inter_click_ad')->default(0)->after('get_bonus_clicks');
            $table->unsignedBigInteger('reward_click_ad')->default(0)->after('inter_click_ad');
            $table->unsignedBigInteger('banner_click_ad')->default(0)->after('reward_click_ad');
        });
    }

    public function down(): void
    {
        Schema::table('adx_realtime_reports', function (Blueprint $table): void {
            $table->dropColumn([
                'inter_click_ad',
                'reward_click_ad',
                'banner_click_ad',
            ]);
        });
    }
};

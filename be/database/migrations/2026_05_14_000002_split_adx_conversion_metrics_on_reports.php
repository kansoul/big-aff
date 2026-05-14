<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adx_spend_reports', function (Blueprint $table): void {
            $table->decimal('landing_view', 15, 4)->default(0)->after('currency');
            $table->decimal('get_game_link_click', 15, 4)->default(0)->after('landing_view');
            $table->decimal('detail_view', 15, 4)->default(0)->after('get_game_link_click');
            $table->decimal('get_bonus_click', 15, 4)->default(0)->after('detail_view');
            $table->dropColumn('platform_conversions');
        });

        Schema::table('adx_campaign_reports', function (Blueprint $table): void {
            $table->decimal('landing_view', 15, 4)->default(0)->after('ads_impressions');
            $table->decimal('get_game_link_click', 15, 4)->default(0)->after('landing_view');
            $table->decimal('detail_view', 15, 4)->default(0)->after('get_game_link_click');
            $table->decimal('get_bonus_click', 15, 4)->default(0)->after('detail_view');
            $table->dropColumn('platform_conversions');
        });
    }

    public function down(): void
    {
        Schema::table('adx_spend_reports', function (Blueprint $table): void {
            $table->decimal('platform_conversions', 15, 4)->default(0)->after('currency');
            $table->dropColumn([
                'landing_view',
                'get_game_link_click',
                'detail_view',
                'get_bonus_click',
            ]);
        });

        Schema::table('adx_campaign_reports', function (Blueprint $table): void {
            $table->decimal('platform_conversions', 15, 4)->default(0)->after('ads_impressions');
            $table->dropColumn([
                'landing_view',
                'get_game_link_click',
                'detail_view',
                'get_bonus_click',
            ]);
        });
    }
};

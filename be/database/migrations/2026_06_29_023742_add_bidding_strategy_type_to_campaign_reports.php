<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->unsignedSmallInteger('bidding_strategy_type')->nullable()->after('target_cpa');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->dropColumn('bidding_strategy_type');
        });
    }
};

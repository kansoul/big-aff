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
            $table->decimal('target_cpa', 15, 2)->nullable()->after('lifetime_budget');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->decimal('target_cpa', 15, 2)->nullable()->after('lifetime_budget');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->dropColumn('target_cpa');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('target_cpa');
        });
    }
};

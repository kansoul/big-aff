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
            $table->unique(['campaign_id', 'date_start'], 'campaign_reports_campaign_id_date_start_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->dropUnique('campaign_reports_campaign_id_date_start_unique');
        });
    }
};

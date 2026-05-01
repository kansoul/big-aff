<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Keep only the latest row per unique key, delete older duplicates
        DB::statement('
            DELETE r1 FROM revenue_reports r1
            INNER JOIN revenue_reports r2
                ON r1.ad_client_id = r2.ad_client_id
                AND r1.style_code   = r2.style_code
                AND r1.channel_code = r2.channel_code
                AND r1.date         = r2.date
                AND r1.id < r2.id
        ');

        Schema::table('revenue_reports', function (Blueprint $table) {
            $table->unique(['ad_client_id', 'style_code', 'channel_code', 'date'], 'revenue_reports_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('revenue_reports', function (Blueprint $table) {
            $table->dropUnique('revenue_reports_unique');
        });
    }
};

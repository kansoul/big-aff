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
        // Delete duplicates, keeping the row with the highest id
        DB::statement('
            DELETE ir FROM insight_reports ir
            INNER JOIN insight_reports ir2
                ON ir.account_id = ir2.account_id
                AND ir.campaign_id = ir2.campaign_id
                AND ir.date_start = ir2.date_start
                AND ir.id < ir2.id
        ');

        Schema::table('insight_reports', function (Blueprint $table) {
            $table->unique(['account_id', 'campaign_id', 'date_start'], 'insight_reports_account_campaign_date_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('insight_reports', function (Blueprint $table) {
            $table->dropUnique('insight_reports_account_campaign_date_unique');
        });
    }
};

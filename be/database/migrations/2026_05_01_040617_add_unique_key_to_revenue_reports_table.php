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

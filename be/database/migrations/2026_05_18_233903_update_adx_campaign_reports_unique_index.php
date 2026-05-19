<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adx_campaign_reports', function (Blueprint $table) {
            $table->dropUnique('adx_campaign_report_uid');
            $table->unique(['date', 'source', 'account_id', 'campaign_id'], 'adx_campaign_report_uid');
        });
    }

    public function down(): void
    {
        Schema::table('adx_campaign_reports', function (Blueprint $table) {
            $table->dropUnique('adx_campaign_report_uid');
            $table->unique(['date', 'source', 'account_id', 'campaign_id', 'adx_link_data_id'], 'adx_campaign_report_uid');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adx_campaign_reports', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('source', 50)->index();
            $table->foreignId('adx_account_id')->nullable()->constrained('adx_accounts')->nullOnDelete();
            $table->foreignId('adx_campaign_id')->nullable()->constrained('adx_campaigns')->nullOnDelete();
            $table->foreignId('adx_link_data_id')->nullable()->constrained('adx_link_datas')->nullOnDelete();
            $table->foreignId('adx_link_id')->nullable()->constrained('adx_links')->nullOnDelete();
            $table->foreignId('adx_game_id')->nullable()->constrained('adx_games')->nullOnDelete();
            $table->foreignId('adx_realtime_report_id')->nullable()->constrained('adx_realtime_reports')->nullOnDelete();
            $table->string('account_id', 191)->nullable()->index();
            $table->string('account_name')->nullable();
            $table->string('campaign_id', 191)->nullable()->index();
            $table->string('campaign_name')->nullable();
            $table->string('campaign_status', 50)->nullable()->index();
            $table->decimal('daily_budget', 15, 4)->default(0);
            $table->decimal('lifetime_budget', 15, 4)->default(0);
            $table->decimal('spend', 15, 4)->default(0);
            $table->decimal('revenue', 15, 4)->default(0);
            $table->decimal('profit', 15, 4)->default(0);
            $table->decimal('roi', 12, 4)->default(0);
            $table->decimal('roas', 12, 4)->default(0);
            $table->unsignedBigInteger('ads_clicks')->default(0);
            $table->unsignedBigInteger('ads_impressions')->default(0);
            $table->decimal('platform_conversions', 15, 4)->default(0);
            $table->unsignedBigInteger('adx_impressions')->default(0);
            $table->unsignedBigInteger('adx_clicks')->default(0);
            $table->unsignedBigInteger('adx_requests')->default(0);
            $table->unsignedBigInteger('adx_matched_requests')->default(0);
            $table->unsignedBigInteger('adx_viewable_impressions')->default(0);
            $table->decimal('cpc', 15, 4)->default(0);
            $table->decimal('epc', 15, 4)->default(0);
            $table->decimal('rpm', 15, 4)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->timestamps();

            $table->unique(['date', 'source', 'account_id', 'campaign_id', 'adx_link_data_id'], 'adx_campaign_report_uid');
            $table->index(['adx_account_id', 'date'], 'adx_campaign_report_account_date_idx');
            $table->index(['adx_campaign_id', 'date'], 'adx_campaign_report_campaign_date_idx');
            $table->index(['account_id', 'date'], 'adx_campaign_report_account_str_date_idx');
            $table->index(['campaign_id', 'date'], 'adx_campaign_report_campaign_str_date_idx');
            $table->index(['adx_link_data_id', 'date'], 'adx_campaign_report_link_data_date_idx');
            $table->index(['adx_realtime_report_id'], 'adx_campaign_report_rt_report_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adx_campaign_reports');
    }
};

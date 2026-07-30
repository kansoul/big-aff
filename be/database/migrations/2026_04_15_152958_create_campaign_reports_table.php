<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_reports', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('realtime_report_id')->nullable();
            $table->date('date_start');

            // campaign
            $table->string('account_id')->index();
            $table->string('account_name')->nullable();
            $table->string('campaign_id')->index();
            $table->string('campaign_name')->nullable();
            $table->string('campaign_status')->nullable();
            $table->string('ads_type', 50)->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->decimal('lifetime_budget', 15, 2)->nullable();

            // Revenue
            $table->string('style_code')->nullable();
            $table->string('style_name')->nullable();
            $table->string('channel_code')->nullable();
            $table->string('channel_name')->nullable();
            $table->integer('r_search_views')->default(0);
            $table->integer('r_conversion')->default(0);
            $table->decimal('r_revenue', 15, 2)->default(0.00);
            $table->decimal('r_rpc', 10, 4)->default(0.0000);
            $table->integer('r_ad_requests')->default(0);
            $table->decimal('r_ad_requests_rpm', 10, 4)->default(0.0000);
            $table->integer('r_impressions')->default(0);
            $table->decimal('r_impressions_rpm', 10, 4)->default(0.0000);
            $table->integer('r_funnel_requests')->default(0);
            $table->integer('r_funnel_clicks')->default(0);
            $table->integer('r_funnel_impressions')->default(0);
            $table->decimal('r_funnel_rpm', 10, 4)->default(0.0000);
            $table->decimal('r_cpa', 10, 4)->default(0.0000);

            // ads / spend
            $table->integer('a_ad_clicks')->default(0);
            $table->integer('a_article_views')->default(0);
            $table->integer('a_search_views')->default(0);
            $table->integer('a_conversion')->default(0);
            $table->decimal('a_spend', 15, 2)->default(0.00);
            $table->integer('a_impressions')->default(0);
            $table->decimal('a_cpc', 10, 4)->default(0.0000);
            $table->decimal('a_cpm', 10, 4)->default(0.0000);
            $table->decimal('a_ctr', 8, 4)->default(0.0000);
            $table->integer('a_reach')->default(0);
            $table->decimal('a_cpa', 10, 4)->default(0.0000);
            $table->decimal('a_ctr_link', 8, 4)->default(0.0000);
            $table->decimal('a_cpc_link', 10, 4)->default(0.0000);
            $table->decimal('a_frequency', 8, 4)->default(0.0000);
            $table->integer('a_clicks')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_reports');
    }
};

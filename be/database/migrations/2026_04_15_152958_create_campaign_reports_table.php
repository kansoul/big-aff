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

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_reports');
    }
};

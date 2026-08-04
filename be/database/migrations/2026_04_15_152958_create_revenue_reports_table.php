<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenue_reports', function (Blueprint $table) {
            $table->id();

            $table->uuid('session_id')->unique();
            $table->string('campaign_id')->index();
            $table->string('adset_id')->nullable()->index();
            $table->string('ad_id')->nullable()->index();
            $table->unsignedBigInteger('click_id')->index();
            $table->decimal('estimate_earning', 15, 4)->default(0);

            $table->unsignedInteger('page_views')->nullable();
            $table->unsignedInteger('clicks')->nullable();
            $table->unsignedInteger('ad_requests')->nullable();
            $table->unsignedInteger('impressions')->nullable();
            $table->decimal('ad_requests_rpm', 15, 4)->nullable();
            $table->decimal('impressions_rpm', 15, 4)->nullable();
            $table->decimal('cost_per_click', 15, 4)->nullable();
            $table->unsignedInteger('funnel_requests')->nullable();
            $table->unsignedInteger('funnel_impressions')->nullable();
            $table->unsignedInteger('funnel_clicks')->nullable();
            $table->decimal('funnel_rpm', 15, 4)->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'created_at'], 'revenue_reports_campaign_date_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_reports');
    }
};

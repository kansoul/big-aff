<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenue_chart_reports', function (Blueprint $table) {
            $table->id();

            $table->string('ad_client_id', 50);
            $table->string('style_code', 100)->index();
            $table->string('channel_code', 100)->index();
            $table->string('style_name')->nullable();
            $table->dateTime('datetime')->index();

            $table->integer('page_views')->nullable();
            $table->integer('clicks')->nullable();
            $table->integer('ad_requests')->nullable();
            $table->integer('impressions')->nullable();
            $table->double('ad_requests_rpm')->nullable();
            $table->double('impressions_rpm')->nullable();
            $table->double('estimated_earnings')->nullable();
            $table->double('cost_per_click')->nullable();
            $table->integer('funnel_requests')->nullable();
            $table->integer('funnel_impressions')->nullable();
            $table->integer('funnel_clicks')->nullable();
            $table->double('funnel_rpm')->nullable();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_chart_reports');
    }
};

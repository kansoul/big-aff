<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insight_chart_reports', function (Blueprint $table) {
            $table->id();

            $table->string('account_id')->index();
            $table->string('campaign_id')->index();
            $table->dateTime('datetime_start')->index();

            $table->unsignedBigInteger('impressions')->nullable();
            $table->unsignedBigInteger('reach')->nullable();
            $table->unsignedInteger('clicks')->nullable();
            $table->unsignedBigInteger('ad_clicks')->nullable();
            $table->unsignedInteger('article_views')->nullable();
            $table->unsignedInteger('search_views')->nullable();
            $table->unsignedInteger('search_clicks')->nullable();
            $table->double('cpa')->nullable();
            $table->double('ctr_link')->nullable();
            $table->double('cpc_link')->nullable();
            $table->float('spend')->nullable();
            $table->float('cpc')->nullable();
            $table->float('cpm')->nullable();
            $table->float('ctr')->nullable();
            $table->float('frequency')->nullable();
            $table->string('spend_type')->nullable();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insight_chart_reports');
    }
};

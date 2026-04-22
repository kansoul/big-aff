<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adset_insights_reports', function (Blueprint $table) {
            $table->id();
            $table->string('adset_id')->index('adset_insights_reports_adset_id_index');
            $table->string('adset_name');
            $table->string('campaign_id')->index('adset_insights_reports_campaign_id_index');
            $table->string('account_id')->index('adset_insights_reports_account_id_index');
            $table->string('status')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->float('spend')->nullable();
            $table->date('date_start')->nullable();
            $table->date('date_stop')->nullable();
            $table->unsignedBigInteger('impressions')->nullable();
            $table->unsignedInteger('clicks')->nullable();
            $table->unsignedBigInteger('reach')->nullable();
            $table->float('cpc')->nullable();
            $table->float('cpm')->nullable();
            $table->float('ctr')->nullable();
            $table->double('cpa')->nullable();
            $table->unsignedBigInteger('ad_clicks')->nullable();
            $table->unsignedInteger('article_views')->nullable();
            $table->unsignedInteger('search_views')->nullable();
            $table->unsignedInteger('search_click')->nullable();
            $table->double('inline_link_click_ctr')->nullable();
            $table->double('cost_per_inline_link_click')->nullable();
            $table->float('frequency')->nullable();
            $table->string('effective_status')->nullable();
            $table->timestamp('updated_time')->nullable();
            $table->timestamp('created_time')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['adset_id', 'date_start'], 'adset_date_unique');
        });

        Schema::create('ads_insights_reports', function (Blueprint $table) {
            $table->id();
            $table->string('ad_id')->index('ads_insights_reports_ad_id_index');
            $table->string('ad_name');
            $table->string('adset_id')->index('ads_insights_reports_adset_id_index');
            $table->string('campaign_id')->index('ads_insights_reports_campaign_id_index');
            $table->string('account_id')->index('ads_insights_reports_account_id_index');
            $table->string('status')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->float('spend')->nullable();
            $table->date('date_start')->nullable();
            $table->date('date_stop')->nullable();
            $table->unsignedBigInteger('impressions')->nullable();
            $table->unsignedInteger('clicks')->nullable();
            $table->unsignedBigInteger('reach')->nullable();
            $table->float('cpc')->nullable();
            $table->float('cpm')->nullable();
            $table->float('ctr')->nullable();
            $table->double('cpa')->nullable();
            $table->unsignedBigInteger('ad_clicks')->nullable();
            $table->unsignedInteger('article_views')->nullable();
            $table->unsignedInteger('search_views')->nullable();
            $table->unsignedInteger('search_click')->nullable();
            $table->double('inline_link_click_ctr')->nullable();
            $table->double('cost_per_inline_link_click')->nullable();
            $table->float('frequency')->nullable();
            $table->string('effective_status')->nullable();
            $table->timestamp('updated_time')->nullable();
            $table->timestamp('created_time')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['ad_id', 'date_start'], 'ads_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ads_insights_reports');
        Schema::dropIfExists('adset_insights_reports');
    }
};

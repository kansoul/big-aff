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
            $table->timestamp('revenue_received_at')->nullable()->after('revenue');
            $table->dropColumn([
                'click_id',
                'estimate_earning',
                'page_views',
                'clicks',
                'ad_requests',
                'impressions',
                'ad_requests_rpm',
                'impressions_rpm',
                'cost_per_click',
                'funnel_requests',
                'funnel_impressions',
                'funnel_clicks',
                'funnel_rpm',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('revenue_reports', function (Blueprint $table) {
            $table->unsignedBigInteger('click_id')->nullable()->index()->after('ad_id');
            $table->decimal('estimate_earning', 15, 4)->default(0)->after('click_id');
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
            $table->dropColumn('revenue_received_at');
        });
    }
};

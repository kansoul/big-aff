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
        Schema::create('adx_revenue_reports', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('gam_network_code', 100)->nullable()->index();
            $table->string('gam_custom_key', 100)->default('campid');
            $table->string('gam_custom_value', 191)->nullable()->index();
            $table->string('campaign_id', 191)->nullable()->index();
            $table->foreignId('adx_link_data_id')->nullable()->constrained('adx_link_datas')->nullOnDelete();
            $table->foreignId('adx_link_id')->nullable()->constrained('adx_links')->nullOnDelete();
            $table->foreignId('adx_game_id')->nullable()->constrained('adx_games')->nullOnDelete();
            $table->string('ad_unit_id', 191)->nullable()->index();
            $table->string('ad_unit_name')->nullable();
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->unsignedBigInteger('requests')->default(0);
            $table->unsignedBigInteger('matched_requests')->default(0);
            $table->unsignedBigInteger('viewable_impressions')->default(0);
            $table->decimal('adx_revenue', 15, 4)->default(0);
            $table->decimal('ad_server_revenue', 15, 4)->default(0);
            $table->decimal('total_revenue', 15, 4)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();

            $table->index(['date', 'campaign_id'], 'adx_revenue_date_campaign_idx');
            $table->index(['date', 'gam_custom_key', 'gam_custom_value'], 'adx_revenue_date_gam_target_idx');
            $table->index(['adx_link_data_id', 'date'], 'adx_revenue_link_data_date_idx');
            $table->index(['adx_link_id', 'adx_game_id', 'date'], 'adx_revenue_link_game_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_revenue_reports');
    }
};

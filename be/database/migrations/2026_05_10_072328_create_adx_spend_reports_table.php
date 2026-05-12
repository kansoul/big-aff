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
        Schema::create('adx_spend_reports', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('source', 50)->index();
            $table->string('account_id', 191)->index();
            $table->string('account_name')->nullable();
            $table->string('campaign_id', 191)->index();
            $table->string('campaign_name')->nullable();
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->decimal('cost', 15, 4)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->decimal('platform_conversions', 15, 4)->default(0);
            $table->timestamp('fetched_at')->nullable();
            $table->timestamps();

            $table->unique(['date', 'source', 'account_id', 'campaign_id'], 'adx_spend_date_source_account_campaign_uid');
            $table->index(['source', 'account_id', 'date'], 'adx_spend_source_account_date_idx');
            $table->index(['campaign_id', 'date'], 'adx_spend_campaign_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_spend_reports');
    }
};

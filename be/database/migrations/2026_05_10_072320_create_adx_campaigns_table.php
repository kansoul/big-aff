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
        Schema::create('adx_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adx_account_id')->nullable()->constrained('adx_accounts')->nullOnDelete();
            $table->string('source', 50)->index();
            $table->string('campaign_id', 191)->index();
            $table->string('campaign_name')->nullable();
            $table->decimal('daily_budget', 15, 4)->default(0);
            $table->decimal('lifetime_budget', 15, 4)->default(0);
            $table->string('gam_custom_key', 100)->default('campid');
            $table->string('gam_custom_value', 191)->nullable()->index();
            $table->string('status', 50)->default('active')->index();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('stop_time')->nullable();
            $table->timestamp('created_time')->nullable();
            $table->timestamp('updated_time')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['source', 'campaign_id'], 'adx_campaigns_source_campaign_uid');
            $table->index(['adx_account_id', 'campaign_id'], 'adx_campaigns_adx_account_campaign_idx');
            $table->index(['source', 'adx_account_id'], 'adx_campaigns_source_adx_account_idx');
            $table->index(['gam_custom_key', 'gam_custom_value'], 'adx_campaigns_gam_target_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_campaigns');
    }
};

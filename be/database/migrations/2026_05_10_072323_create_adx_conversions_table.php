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
        Schema::create('adx_conversions', function (Blueprint $table) {
            $table->id();
            $table->string('event_id', 191)->unique();
            $table->foreignId('adx_link_data_id')->nullable()->constrained('adx_link_datas')->nullOnDelete();
            $table->string('source', 50)->index();
            $table->string('account_id', 191)->nullable()->index();
            $table->string('campaign_id', 191)->index();
            $table->string('conversion_type', 50)->index();
            $table->string('conversion_action_id', 191)->nullable()->index();
            $table->decimal('conversion_value', 15, 4)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->text('gclid')->nullable();
            $table->text('gbraid')->nullable();
            $table->text('wbraid')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->string('sync_status', 50)->default('pending')->index();
            $table->timestamp('synced_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'sync_status', 'occurred_at'], 'adx_conv_account_sync_time_idx');
            $table->index(['campaign_id', 'conversion_type', 'occurred_at'], 'adx_conv_campaign_type_time_idx');
            $table->index(['adx_link_data_id', 'conversion_type', 'occurred_at'], 'adx_conv_link_data_type_time_idx');
            $table->index(['source', 'account_id', 'conversion_action_id'], 'adx_conv_source_account_action_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adx_conversions');
    }
};

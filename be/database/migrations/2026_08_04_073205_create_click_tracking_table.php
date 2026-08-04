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
        Schema::create('click_tracking', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->nullable()->index();
            $table->string('campaign_id')->nullable();
            $table->string('adset_id')->nullable();
            $table->string('ad_id')->nullable();
            $table->string('event_type', 100)->index();
            $table->string('page', 500)->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('event_time')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['campaign_id', 'event_type', 'created_at'], 'idx_click_tracking_campaign_event');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('click_tracking');
    }
};

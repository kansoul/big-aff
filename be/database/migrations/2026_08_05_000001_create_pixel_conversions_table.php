<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pixel_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ads_link_id')->nullable()->constrained('ads_links')->nullOnDelete();
            $table->string('tracking_code')->nullable();
            $table->string('platform', 50)->default('tiktok');
            $table->string('advertiser_id')->nullable();
            $table->string('pixel_id')->nullable();
            $table->string('event_name')->nullable();
            $table->string('event_id')->nullable();
            $table->string('session_id')->nullable();
            $table->string('campaign_id')->nullable();
            $table->string('adset_id')->nullable();
            $table->string('ad_id')->nullable();
            $table->string('click_id')->nullable();
            $table->decimal('conversion_value', 15, 6)->nullable();
            $table->string('currency_code', 50)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('conversion_date_time')->nullable();
            $table->text('postback_url')->nullable();
            $table->unsignedTinyInteger('postback_attempts')->default(0);
            $table->unsignedSmallInteger('postback_status')->nullable();
            $table->text('postback_response')->nullable();
            $table->timestamp('postback_sent_at')->nullable();
            $table->timestamps();

            $table->index('tracking_code');
            $table->index('session_id');
            $table->index('campaign_id');
            $table->index('event_id');
            $table->index('postback_sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pixel_conversions');
    }
};

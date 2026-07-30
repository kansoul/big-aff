<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('account_id')->nullable();
            $table->string('ads_type', 50); // 'google', 'tiktok'
            $table->string('campaign_id')->unique();
            $table->string('campaign_name')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->decimal('lifetime_budget', 15, 2)->nullable();
            $table->string('status', 50)->nullable(); // 'ENABLED', 'PAUSED', 'REMOVED'
            $table->timestamp('start_time')->nullable();
            $table->timestamp('stop_time')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};

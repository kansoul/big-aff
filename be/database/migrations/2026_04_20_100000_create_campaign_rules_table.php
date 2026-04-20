<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('code_rule')->unique();
            $table->string('entity_type')->default('campaign'); // campaign | ad_adset
            $table->boolean('is_active')->default(true);
            $table->timestamp('expired_at')->nullable();

            // Campaign-level conditions
            $table->decimal('min_roi', 10, 2)->nullable();
            $table->decimal('min_profit', 15, 2)->nullable();
            $table->decimal('min_revenue', 15, 2)->nullable();
            $table->decimal('min_spend', 15, 2)->nullable();

            // Ad/Adset-level conditions
            $table->decimal('max_cpa', 15, 2)->nullable();
            $table->integer('min_conversion')->nullable();
            $table->decimal('min_spend_adset', 15, 2)->nullable();

            // Time window
            $table->string('start_hour', 5)->nullable(); // HH:MM
            $table->string('end_hour', 5)->nullable();   // HH:MM

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_rules');
    }
};

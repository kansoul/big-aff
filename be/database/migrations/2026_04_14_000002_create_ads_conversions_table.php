<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ads_conversions', function (Blueprint $table) {
            $table->id();
            $table->string('account_id')->nullable();
            $table->string('gclid')->nullable();
            $table->string('wbraid')->nullable();
            $table->string('gbraid')->nullable();
            $table->string('conversion_action_resource_name')->nullable();
            $table->decimal('conversion_value', 15, 6)->nullable();
            $table->string('currency_code', 50)->nullable();
            $table->timestamp('conversion_date_time')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ads_conversions');
    }
};

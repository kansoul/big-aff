<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_schedule_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_schedule_id');
            $table->string('campaign_id');

            $table->foreign('campaign_schedule_id')->references('id')->on('campaign_schedules')->onDelete('cascade');
            $table->index('campaign_schedule_id');
            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_schedule_items');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracking_sessions', function (Blueprint $table) {
            $table->uuid('session_id')->primary(); // char(36)
            $table->string('ip_address', 45)->nullable();
            $table->string('device', 20)->nullable();
            $table->string('browser', 50)->nullable();
            $table->char('country', 2)->nullable();
            $table->text('referrer')->nullable();
            $table->text('user_agent')->nullable();
            $table->boolean('is_bot')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking_sessions');
    }
};

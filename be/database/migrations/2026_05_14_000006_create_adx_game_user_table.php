<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adx_game_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('adx_game_id')->constrained('adx_games')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['adx_game_id', 'user_id'], 'adx_game_user_game_user_uid');
            $table->index(['user_id', 'adx_game_id'], 'adx_game_user_user_game_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adx_game_user');
    }
};

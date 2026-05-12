<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adx_account_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adx_account_id')->constrained('adx_accounts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['adx_account_id', 'user_id'], 'adx_account_user_account_user_uid');
            $table->index(['user_id', 'adx_account_id'], 'adx_account_user_user_account_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adx_account_user');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_user', function (Blueprint $table) {
            $table->id()->first();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('account_user', function (Blueprint $table) {
            $table->dropColumn(['id', 'created_at', 'updated_at']);
        });
    }
};

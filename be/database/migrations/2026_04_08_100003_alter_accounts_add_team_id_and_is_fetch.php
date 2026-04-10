<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->unsignedBigInteger('team_id')->nullable()->after('business_center_id');
            $table->foreign('team_id')->references('id')->on('teams')->nullOnDelete();
            $table->renameColumn('is_special', 'is_fetch');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->renameColumn('is_fetch', 'is_special');
            $table->dropForeign(['team_id']);
            $table->dropColumn('team_id');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('site_id')->constrained('accounts')->nullOnDelete();
        });
    }
};

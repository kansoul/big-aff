<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->boolean('roas_enabled')->default(true)->after('sync_to_mcc');
        });

        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->string('session_id')->nullable()->after('gbraid');
            $table->string('ip_address', 45)->nullable()->after('currency_code');
            $table->string('user_agent', 1000)->nullable()->after('ip_address');
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('roas_enabled');
        });

        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->dropColumn(['session_id', 'ip_address', 'user_agent']);
        });
    }
};

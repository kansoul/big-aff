<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->string('campaign_id')->nullable()->after('account_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('ads_conversions', function (Blueprint $table) {
            $table->dropIndex(['campaign_id']);
            $table->dropColumn('campaign_id');
        });
    }
};

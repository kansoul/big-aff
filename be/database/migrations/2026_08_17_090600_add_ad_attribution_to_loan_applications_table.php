<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Keeps the full ad attribution on the application so a returning visitor with
 * a new session can still be matched to the application they left unfinished.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            $table->string('adset_id')->nullable()->after('campaign_id');
            $table->string('ad_id')->nullable()->after('adset_id');
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            $table->dropColumn(['adset_id', 'ad_id']);
        });
    }
};

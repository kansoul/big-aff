<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links an application back to the tracking session that produced it, so
 * reports can join it with event / revenue / ads conversion data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            $table->uuid('session_id')->nullable()->after('public_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table): void {
            $table->dropIndex(['session_id']);
            $table->dropColumn('session_id');
        });
    }
};

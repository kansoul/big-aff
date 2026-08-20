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
        // MySQL does not support foreign keys on the partitioned event tables.
        // Their session relationship remains enforced at the application layer.
        foreach (['revenue_reports', 'ads_conversions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreign('session_id')->references('session_id')->on('tracking_sessions')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['revenue_reports', 'ads_conversions'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['session_id']);
            });
        }
    }
};

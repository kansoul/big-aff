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
        try {
            Schema::table('conversions', function (Blueprint $table) {
                $table->dropForeign(['account_id']);
            });
        } catch (\Exception $e) {
            // The foreign key may have already been dropped.
        }

        Schema::table('conversions', function (Blueprint $table) {
            $table->string('account_id')->change();
            $table->foreign('account_id')->references('account_id')->on('accounts')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            Schema::table('conversions', function (Blueprint $table) {
                $table->dropForeign(['account_id']);
            });
        } catch (\Exception $e) {
            // The foreign key may have already been dropped.
        }

        Schema::table('conversions', function (Blueprint $table) {
            $table->unsignedBigInteger('account_id')->change();
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('cascade');
        });
    }
};

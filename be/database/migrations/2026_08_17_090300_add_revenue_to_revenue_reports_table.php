<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('revenue_reports', function (Blueprint $table) {
            $table->decimal('revenue', 15, 4)->default(0)->after('estimate_earning');
            // A row is now opened on page_view, before any click is attributed.
            $table->unsignedBigInteger('click_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('revenue_reports', function (Blueprint $table) {
            $table->dropColumn('revenue');
            $table->unsignedBigInteger('click_id')->nullable(false)->change();
        });
    }
};

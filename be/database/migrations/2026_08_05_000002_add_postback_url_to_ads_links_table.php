<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->text('postback_url')->nullable()->after('tracking_ids');
        });
    }

    public function down(): void
    {
        Schema::table('ads_links', function (Blueprint $table) {
            $table->dropColumn('postback_url');
        });
    }
};

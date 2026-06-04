<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_clicks', function (Blueprint $table) {
            $table->text('traffic')->nullable()->after('keyword_clicked');
        });

        Schema::table('event_views', function (Blueprint $table) {
            $table->text('traffic')->nullable()->after('query');
        });
    }

    public function down(): void
    {
        Schema::table('event_clicks', function (Blueprint $table) {
            $table->dropColumn('traffic');
        });

        Schema::table('event_views', function (Blueprint $table) {
            $table->dropColumn('traffic');
        });
    }
};

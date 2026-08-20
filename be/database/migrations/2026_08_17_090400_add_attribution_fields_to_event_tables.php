<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The landing snippet replays the whole landing context on every event, so both
 * event tables now keep the same set of attribution columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_views', function (Blueprint $table) {
            $table->string('utm_source', 64)->nullable()->after('page');
            $table->string('keyword_clicked', 750)->nullable()->after('query');
        });

        Schema::table('event_clicks', function (Blueprint $table) {
            $table->string('utm_source', 64)->nullable()->after('page');
            $table->text('query')->nullable()->after('utm_source');
        });
    }

    public function down(): void
    {
        Schema::table('event_views', function (Blueprint $table) {
            $table->dropColumn(['utm_source', 'keyword_clicked']);
        });

        Schema::table('event_clicks', function (Blueprint $table) {
            $table->dropColumn(['utm_source', 'query']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ad networks and the external tracker add their own ids to the landing URL:
 * `placement` (where the ad ran), `cpid` / `lpid` (tracker campaign / landing
 * page ids). The snippet replays them on every event, so both tables keep them.
 */
return new class extends Migration
{
    private const COLUMNS = ['event_views', 'event_clicks'];

    public function up(): void
    {
        foreach (self::COLUMNS as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->string('placement', 64)->nullable()->after('utm_source');
                $table->string('cpid', 64)->nullable()->after('placement');
                $table->string('lpid', 64)->nullable()->after('cpid');
            });
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNS as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn(['placement', 'cpid', 'lpid']);
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add composite indexes so the per-entity realtime conversion subqueries
     * (adset_id|ad_id + type + created_at) can use an index range seek instead
     * of scanning every partition of event_clicks.
     */
    public function up(): void
    {
        Schema::table('event_clicks', function (Blueprint $table): void {
            $table->index(['adset_id', 'type', 'created_at'], 'idx_event_clicks_adset_type_date');
            $table->index(['ad_id', 'type', 'created_at'], 'idx_event_clicks_ad_type_date');
        });
    }

    public function down(): void
    {
        Schema::table('event_clicks', function (Blueprint $table): void {
            $table->dropIndex('idx_event_clicks_adset_type_date');
            $table->dropIndex('idx_event_clicks_ad_type_date');
        });
    }
};

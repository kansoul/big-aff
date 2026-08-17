<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The tracking funnel is now page_view → redirect → next_step → lead, so the
 * counters are renamed to match the events that feed them.
 */
return new class extends Migration
{
    private const RENAMES = [
        'view_article_count' => 'view_count',
        'view_search_count' => 'redirect_count',
        'click_keyword_count' => 'next_step_count',
        'click_ad_count' => 'lead_count',
    ];

    public function up(): void
    {
        Schema::table('realtime_reports', function (Blueprint $table) {
            foreach (self::RENAMES as $from => $to) {
                $table->renameColumn($from, $to);
            }
        });
    }

    public function down(): void
    {
        Schema::table('realtime_reports', function (Blueprint $table) {
            foreach (self::RENAMES as $from => $to) {
                $table->renameColumn($to, $from);
            }
        });
    }
};

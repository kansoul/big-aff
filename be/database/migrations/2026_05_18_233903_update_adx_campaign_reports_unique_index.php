<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove duplicate rows, keeping the most complete record per campaign per day.
        // We prefer the row with adx_link_data_id set; among ties we keep the highest id.
        $dupeGroups = DB::table('adx_campaign_reports')
            ->select('date', 'source', 'account_id', 'campaign_id')
            ->groupBy('date', 'source', 'account_id', 'campaign_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dupeGroups as $group) {
            $records = DB::table('adx_campaign_reports')
                ->where('date', $group->date)
                ->where('source', $group->source)
                ->where('account_id', $group->account_id)
                ->where('campaign_id', $group->campaign_id)
                ->orderByRaw('adx_link_data_id IS NULL ASC') // nulls last
                ->orderByDesc('id')
                ->get(['id']);

            $deleteIds = $records->skip(1)->pluck('id')->all();
            if (! empty($deleteIds)) {
                DB::table('adx_campaign_reports')->whereIn('id', $deleteIds)->delete();
            }
        }

        Schema::table('adx_campaign_reports', function (Blueprint $table) {
            $indexes = collect(DB::select("SHOW INDEX FROM adx_campaign_reports WHERE Key_name = 'adx_campaign_report_uid'"));
            if ($indexes->isNotEmpty()) {
                $table->dropUnique('adx_campaign_report_uid');
            }

            $table->unique(['date', 'source', 'account_id', 'campaign_id'], 'adx_campaign_report_uid');
        });
    }

    public function down(): void
    {
        Schema::table('adx_campaign_reports', function (Blueprint $table) {
            $indexes = collect(DB::select("SHOW INDEX FROM adx_campaign_reports WHERE Key_name = 'adx_campaign_report_uid'"));
            if ($indexes->isNotEmpty()) {
                $table->dropUnique('adx_campaign_report_uid');
            }

            $table->unique(['date', 'source', 'account_id', 'campaign_id', 'adx_link_data_id'], 'adx_campaign_report_uid');
        });
    }
};

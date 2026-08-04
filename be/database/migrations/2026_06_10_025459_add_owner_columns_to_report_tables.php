<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add ownership marker columns so revenue/spend can be attributed to the user
     * (and main team) that owned the channel/account at sync time, without joining
     * assignment pivots at read time.
     *
     * No FK constraints are added, matching the existing report-table convention
     * (these high-throughput sync tables intentionally avoid foreign keys).
     */
    public function up(): void
    {
        Schema::table('insight_reports', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable()->after('spend_type');
            $table->unsignedBigInteger('owner_main_team_id')->nullable()->after('owner_user_id');

            $table->index(['owner_user_id', 'date_start'], 'insight_reports_owner_user_date_index');
            $table->index(['owner_main_team_id', 'date_start'], 'insight_reports_owner_main_team_date_index');
        });

        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable()->after('account_id');

            $table->index(['owner_user_id', 'date_start'], 'campaign_reports_owner_user_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('insight_reports', function (Blueprint $table) {
            $table->dropIndex('insight_reports_owner_user_date_index');
            $table->dropIndex('insight_reports_owner_main_team_date_index');
            $table->dropColumn(['owner_user_id', 'owner_main_team_id']);
        });

        Schema::table('campaign_reports', function (Blueprint $table) {
            $table->dropIndex('campaign_reports_owner_user_date_index');
            $table->dropColumn('owner_user_id');
        });
    }
};

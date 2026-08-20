<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('redirect', 'lead', 'submit_form') NULL");
        DB::statement("UPDATE `event_clicks` SET `type` = 'submit_form' WHERE `type` = 'lead'");
        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('redirect', 'submit_form') NULL");

        Schema::table('realtime_reports', function (Blueprint $table): void {
            $table->dropColumn('next_step_count');
            $table->renameColumn('lead_count', 'submit_form_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('realtime_reports', function (Blueprint $table): void {
            $table->unsignedBigInteger('next_step_count')->default(0)->after('redirect_count');
            $table->renameColumn('submit_form_count', 'lead_count');
        });

        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('redirect', 'lead', 'submit_form') NULL");
        DB::statement("UPDATE `event_clicks` SET `type` = 'lead' WHERE `type` = 'submit_form'");
        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('redirect', 'lead') NULL");
    }
};

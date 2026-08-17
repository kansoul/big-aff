<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('form_view', 'redirect', 'lead') NULL");
        // form_view is retired; the equivalent event in the new funnel is redirect.
        DB::statement("UPDATE `event_clicks` SET `type` = 'redirect' WHERE `type` = 'form_view'");
        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('redirect', 'lead') NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("DELETE FROM `event_clicks` WHERE `type` IN ('redirect', 'lead')");
        DB::statement("ALTER TABLE `event_clicks` MODIFY `type` ENUM('form_view') NULL");
    }
};

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

        foreach (['event_views', 'event_clicks'] as $table) {
            // quickpayly is the only page in production; older rows are folded into it.
            DB::statement("ALTER TABLE `{$table}` MODIFY `page` ENUM('quickpayly', 'article', 'search') NULL");
            DB::statement("UPDATE `{$table}` SET `page` = 'quickpayly' WHERE `page` IN ('article', 'search')");
            DB::statement("ALTER TABLE `{$table}` MODIFY `page` ENUM('quickpayly') NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach (['event_views', 'event_clicks'] as $table) {
            DB::statement("UPDATE `{$table}` SET `page` = NULL WHERE `page` = 'quickpayly'");
            DB::statement("ALTER TABLE `{$table}` MODIFY `page` ENUM('article', 'search') NULL");
        }
    }
};

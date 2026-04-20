<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Re-partition event_clicks and event_views tables by event_time instead of created_at.
 *
 * MySQL RANGE partitioning requires:
 *  - The partition column must NOT be nullable.
 *  - The partition column must be part of every unique / primary key.
 *
 * Steps per table:
 *  1. Remove existing RANGE partitioning (by created_at).
 *  2. Make event_time NOT NULL (default to created_at for existing rows).
 *  3. Adjust PK from (id, created_at) → (id, event_time).
 *  4. Re-apply RANGE partitioning on event_time using UNIX_TIMESTAMP.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── event_clicks ─────────────────────────────────────────────────
        DB::statement('ALTER TABLE `event_clicks` REMOVE PARTITIONING');

        // Backfill NULL event_time values with created_at
        DB::statement('UPDATE `event_clicks` SET `event_time` = `created_at` WHERE `event_time` IS NULL');

        // Make event_time NOT NULL (required for partition key)
        DB::statement('ALTER TABLE `event_clicks` MODIFY `event_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');

        // Change PK from (id, created_at) to (id, event_time)
        DB::statement('ALTER TABLE `event_clicks` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `event_time`)');

        DB::statement("
            ALTER TABLE `event_clicks`
            PARTITION BY RANGE (UNIX_TIMESTAMP(`event_time`)) (
                PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
                PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
                PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
                PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
                PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
                PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
                PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
                PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
                PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
                PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
                PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
                PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");

        // ── event_views ──────────────────────────────────────────────────
        DB::statement('ALTER TABLE `event_views` REMOVE PARTITIONING');

        // Backfill NULL event_time values with created_at
        DB::statement('UPDATE `event_views` SET `event_time` = `created_at` WHERE `event_time` IS NULL');

        // Make event_time NOT NULL (required for partition key)
        DB::statement('ALTER TABLE `event_views` MODIFY `event_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');

        // Change PK from (id, created_at) to (id, event_time)
        DB::statement('ALTER TABLE `event_views` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `event_time`)');

        DB::statement("
            ALTER TABLE `event_views`
            PARTITION BY RANGE (UNIX_TIMESTAMP(`event_time`)) (
                PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
                PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
                PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
                PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
                PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
                PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
                PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
                PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
                PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
                PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
                PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
                PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");
    }

    public function down(): void
    {
        // ── event_clicks — revert to partitioning by created_at ──────────
        DB::statement('ALTER TABLE `event_clicks` REMOVE PARTITIONING');
        DB::statement('ALTER TABLE `event_clicks` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `created_at`)');
        DB::statement('ALTER TABLE `event_clicks` MODIFY `event_time` TIMESTAMP NULL DEFAULT NULL');

        DB::statement("
            ALTER TABLE `event_clicks`
            PARTITION BY RANGE (UNIX_TIMESTAMP(`created_at`)) (
                PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
                PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
                PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
                PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
                PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
                PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
                PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
                PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
                PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
                PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
                PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
                PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");

        // ── event_views — revert to partitioning by created_at ───────────
        DB::statement('ALTER TABLE `event_views` REMOVE PARTITIONING');
        DB::statement('ALTER TABLE `event_views` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `created_at`)');
        DB::statement('ALTER TABLE `event_views` MODIFY `event_time` TIMESTAMP NULL DEFAULT NULL');

        DB::statement("
            ALTER TABLE `event_views`
            PARTITION BY RANGE (UNIX_TIMESTAMP(`created_at`)) (
                PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01 00:00:00')),
                PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01 00:00:00')),
                PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01 00:00:00')),
                PARTITION p202604 VALUES LESS THAN (UNIX_TIMESTAMP('2026-05-01 00:00:00')),
                PARTITION p202605 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-01 00:00:00')),
                PARTITION p202606 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
                PARTITION p202607 VALUES LESS THAN (UNIX_TIMESTAMP('2026-08-01 00:00:00')),
                PARTITION p202608 VALUES LESS THAN (UNIX_TIMESTAMP('2026-09-01 00:00:00')),
                PARTITION p202609 VALUES LESS THAN (UNIX_TIMESTAMP('2026-10-01 00:00:00')),
                PARTITION p202610 VALUES LESS THAN (UNIX_TIMESTAMP('2026-11-01 00:00:00')),
                PARTITION p202611 VALUES LESS THAN (UNIX_TIMESTAMP('2026-12-01 00:00:00')),
                PARTITION p202612 VALUES LESS THAN (UNIX_TIMESTAMP('2027-01-01 00:00:00')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");
    }
};

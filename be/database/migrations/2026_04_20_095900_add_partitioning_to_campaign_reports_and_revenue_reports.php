<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add RANGE partitioning by month to:
 *  - campaign_reports       (partition by date_start, DATE  → TO_DAYS)
 *  - revenue_chart_reports  (partition by datetime,   DATETIME → TO_DAYS)
 *  - insight_chart_reports  (partition by datetime_start, DATETIME → TO_DAYS)
 *
 * MySQL RANGE partition requirements:
 *  - The partition expression column must be part of every unique / primary key.
 *  - FK constraints are incompatible with partitioned tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // ── campaign_reports ─────────────────────────────────────────────
        // 1. Drop existing unique (campaign_id, date_start) — will re-add after PK change.
        // 2. Drop auto-increment PK and re-create as composite (id, date_start).
        // 3. Re-add unique (campaign_id, date_start) — already includes partition column.
        // 4. Apply RANGE partitioning on date_start (DATE → TO_DAYS).
        DB::statement('ALTER TABLE `campaign_reports` DROP INDEX `campaign_reports_campaign_id_date_start_unique`');
        DB::statement('ALTER TABLE `campaign_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `date_start`)');
        DB::statement('ALTER TABLE `campaign_reports` ADD UNIQUE `campaign_reports_campaign_id_date_start_unique` (`campaign_id`, `date_start`)');

        DB::statement("
            ALTER TABLE `campaign_reports`
            PARTITION BY RANGE (TO_DAYS(`date_start`)) (
                PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
                PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
                PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
                PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01')),
                PARTITION p202605 VALUES LESS THAN (TO_DAYS('2026-06-01')),
                PARTITION p202606 VALUES LESS THAN (TO_DAYS('2026-07-01')),
                PARTITION p202607 VALUES LESS THAN (TO_DAYS('2026-08-01')),
                PARTITION p202608 VALUES LESS THAN (TO_DAYS('2026-09-01')),
                PARTITION p202609 VALUES LESS THAN (TO_DAYS('2026-10-01')),
                PARTITION p202610 VALUES LESS THAN (TO_DAYS('2026-11-01')),
                PARTITION p202611 VALUES LESS THAN (TO_DAYS('2026-12-01')),
                PARTITION p202612 VALUES LESS THAN (TO_DAYS('2027-01-01')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");

        // ── revenue_chart_reports ────────────────────────────────────────
        // 1. Drop auto-increment PK and re-create as composite (id, datetime).
        // 2. Apply RANGE partitioning on datetime (DATETIME → TO_DAYS).
        DB::statement('ALTER TABLE `revenue_chart_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `datetime`)');

        DB::statement("
            ALTER TABLE `revenue_chart_reports`
            PARTITION BY RANGE (TO_DAYS(`datetime`)) (
                PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
                PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
                PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
                PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01')),
                PARTITION p202605 VALUES LESS THAN (TO_DAYS('2026-06-01')),
                PARTITION p202606 VALUES LESS THAN (TO_DAYS('2026-07-01')),
                PARTITION p202607 VALUES LESS THAN (TO_DAYS('2026-08-01')),
                PARTITION p202608 VALUES LESS THAN (TO_DAYS('2026-09-01')),
                PARTITION p202609 VALUES LESS THAN (TO_DAYS('2026-10-01')),
                PARTITION p202610 VALUES LESS THAN (TO_DAYS('2026-11-01')),
                PARTITION p202611 VALUES LESS THAN (TO_DAYS('2026-12-01')),
                PARTITION p202612 VALUES LESS THAN (TO_DAYS('2027-01-01')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");

        // ── insight_chart_reports ────────────────────────────────────────
        // 1. Drop auto-increment PK and re-create as composite (id, datetime_start).
        // 2. Apply RANGE partitioning on datetime_start (DATETIME → TO_DAYS).
        DB::statement('ALTER TABLE `insight_chart_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `datetime_start`)');

        DB::statement("
            ALTER TABLE `insight_chart_reports`
            PARTITION BY RANGE (TO_DAYS(`datetime_start`)) (
                PARTITION p202601 VALUES LESS THAN (TO_DAYS('2026-02-01')),
                PARTITION p202602 VALUES LESS THAN (TO_DAYS('2026-03-01')),
                PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
                PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01')),
                PARTITION p202605 VALUES LESS THAN (TO_DAYS('2026-06-01')),
                PARTITION p202606 VALUES LESS THAN (TO_DAYS('2026-07-01')),
                PARTITION p202607 VALUES LESS THAN (TO_DAYS('2026-08-01')),
                PARTITION p202608 VALUES LESS THAN (TO_DAYS('2026-09-01')),
                PARTITION p202609 VALUES LESS THAN (TO_DAYS('2026-10-01')),
                PARTITION p202610 VALUES LESS THAN (TO_DAYS('2026-11-01')),
                PARTITION p202611 VALUES LESS THAN (TO_DAYS('2026-12-01')),
                PARTITION p202612 VALUES LESS THAN (TO_DAYS('2027-01-01')),
                PARTITION p_future VALUES LESS THAN MAXVALUE
            )
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // ── campaign_reports — remove partitioning, restore original PK ──
        DB::statement('ALTER TABLE `campaign_reports` REMOVE PARTITIONING');
        DB::statement('ALTER TABLE `campaign_reports` DROP INDEX `campaign_reports_campaign_id_date_start_unique`');
        DB::statement('ALTER TABLE `campaign_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`)');
        DB::statement('ALTER TABLE `campaign_reports` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
        DB::statement('ALTER TABLE `campaign_reports` ADD UNIQUE `campaign_reports_campaign_id_date_start_unique` (`campaign_id`, `date_start`)');

        // ── revenue_chart_reports — remove partitioning, restore original PK ──
        DB::statement('ALTER TABLE `revenue_chart_reports` REMOVE PARTITIONING');
        DB::statement('ALTER TABLE `revenue_chart_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`)');
        DB::statement('ALTER TABLE `revenue_chart_reports` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');

        // ── insight_chart_reports — remove partitioning, restore original PK ──
        DB::statement('ALTER TABLE `insight_chart_reports` REMOVE PARTITIONING');
        DB::statement('ALTER TABLE `insight_chart_reports` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`)');
        DB::statement('ALTER TABLE `insight_chart_reports` MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
    }
};

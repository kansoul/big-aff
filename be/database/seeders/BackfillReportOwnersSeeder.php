<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Backfills the ownership marker columns (owner_user_id / owner_main_team_id) on the
 * report tables for data synced before those columns existed.
 *
 * Ownership is resolved exactly like the live sync path:
 *   - revenue_reports  → channel (by code): latest channel_user + channel.main_team_id
 *   - insight_reports  → account (by external account_id): latest account_user + account.main_team_id
 *   - campaign_reports → account (by external account_id): latest account_user (owner_user_id only)
 *
 * "Latest" assignment wins because a channel/account is assigned to a single user.
 * Soft-deleted channel_user pivots are ignored. Bulk JOIN updates keep this efficient
 * on large tables; the seeder is idempotent and safe to re-run.
 */
class BackfillReportOwnersSeeder extends Seeder
{
    public function run(): void
    {
        $this->backfillRevenueReports();
        $this->backfillInsightReports();
        $this->backfillCampaignReports();
    }

    private function backfillRevenueReports(): void
    {
        $affected = DB::update(<<<'SQL'
            UPDATE revenue_reports rr
            JOIN channels c
                ON c.code = rr.channel_code
                AND c.deleted_at IS NULL
            LEFT JOIN (
                SELECT cu.channel_id, cu.user_id
                FROM channel_user cu
                JOIN (
                    SELECT channel_id, MAX(id) AS max_id
                    FROM channel_user
                    WHERE deleted_at IS NULL
                    GROUP BY channel_id
                ) latest
                    ON latest.channel_id = cu.channel_id
                    AND latest.max_id = cu.id
            ) owner ON owner.channel_id = c.id
            SET rr.owner_user_id = owner.user_id,
                rr.owner_main_team_id = c.main_team_id
            WHERE rr.deleted_at IS NULL
        SQL);

        $this->command?->info("[BackfillReportOwners] revenue_reports updated: {$affected}");
    }

    private function backfillInsightReports(): void
    {
        $affected = DB::update(<<<'SQL'
            UPDATE insight_reports ir
            JOIN accounts a
                ON a.account_id = ir.account_id
                AND a.deleted_at IS NULL
            LEFT JOIN (
                SELECT au.account_id, au.user_id
                FROM account_user au
                JOIN (
                    SELECT account_id, MAX(id) AS max_id
                    FROM account_user
                    GROUP BY account_id
                ) latest
                    ON latest.account_id = au.account_id
                    AND latest.max_id = au.id
            ) owner ON owner.account_id = a.id
            SET ir.owner_user_id = owner.user_id,
                ir.owner_main_team_id = a.main_team_id
            WHERE ir.deleted_at IS NULL
        SQL);

        $this->command?->info("[BackfillReportOwners] insight_reports updated: {$affected}");
    }

    private function backfillCampaignReports(): void
    {
        $affected = DB::update(<<<'SQL'
            UPDATE campaign_reports cr
            JOIN accounts a
                ON a.account_id = cr.account_id
                AND a.deleted_at IS NULL
            JOIN (
                SELECT au.account_id, au.user_id
                FROM account_user au
                JOIN (
                    SELECT account_id, MAX(id) AS max_id
                    FROM account_user
                    GROUP BY account_id
                ) latest
                    ON latest.account_id = au.account_id
                    AND latest.max_id = au.id
            ) owner ON owner.account_id = a.id
            SET cr.owner_user_id = owner.user_id
        SQL);

        $this->command?->info("[BackfillReportOwners] campaign_reports updated: {$affected}");
    }
}

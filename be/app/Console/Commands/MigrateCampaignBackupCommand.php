<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\UserCampaignRuleSetting;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateCampaignBackupCommand extends Command
{
    protected $signature = 'backup:migrate-campaigns
        {--campaigns-path= : Absolute path to campaigns-backup.json}
        {--campaign-rules-path= : Absolute path to campaign_rules-backup.json}
        {--apply-rules-path= : Absolute path to campaign_apply_rules-backup.json}
        {--user-settings-path= : Absolute path to user_campaign_rule_settings-backup.json}
        {--truncate : Truncate all campaign-related tables before importing}';

    protected $description = 'Migrate campaign backup JSON files into campaign-related tables';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $campaignsPath = $this->option('campaigns-path') ?: storage_path('app/backup/campaigns-backup.json');
        $rulesPath = $this->option('campaign-rules-path') ?: storage_path('app/backup/campaign_rules-backup.json');
        $applyRulesPath = $this->option('apply-rules-path') ?: storage_path('app/backup/campaign_apply_rules-backup.json');
        $userSettingsPath = $this->option('user-settings-path') ?: storage_path('app/backup/user_campaign_rule_settings-backup.json');

        foreach ([$campaignsPath, $rulesPath, $applyRulesPath, $userSettingsPath] as $path) {
            if (! is_file($path)) {
                $this->error("Backup file not found: {$path}");

                return self::FAILURE;
            }
        }

        /** @var array<int, array<string, mixed>> $campaignRecords */
        $campaignRecords = json_decode((string) file_get_contents($campaignsPath), true) ?? [];
        /** @var array<int, array<string, mixed>> $ruleRecords */
        $ruleRecords = json_decode((string) file_get_contents($rulesPath), true) ?? [];
        /** @var array<int, array<string, mixed>> $applyRuleRecords */
        $applyRuleRecords = json_decode((string) file_get_contents($applyRulesPath), true) ?? [];
        /** @var array<int, array<string, mixed>> $userSettingRecords */
        $userSettingRecords = json_decode((string) file_get_contents($userSettingsPath), true) ?? [];

        if ((bool) $this->option('truncate')) {
            $this->truncateTables();
        }

        /** @var array<string, true> $validAccountIds accounts.account_id (string) => true */
        $validAccountIds = DB::table('accounts')
            ->select('account_id')
            ->pluck('account_id')
            ->flip()
            ->all();

        /** @var array<string, int> $userEmailMap email => users.id */
        $userEmailMap = DB::table('users')
            ->select('id', 'email')
            ->get()
            ->pluck('id', 'email')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        $campaignStats = $this->importCampaigns($campaignRecords, $validAccountIds);

        /** @var array<string, true> $campaignIdMap campaign_id (external string) => true */
        $campaignIdMap = DB::table('campaigns')
            ->select('campaign_id')
            ->pluck('campaign_id')
            ->flip()
            ->all();

        [$ruleStats] = $this->importCampaignRules($ruleRecords, $userEmailMap);
        $applyStats = $this->importCampaignApplyRules($applyRuleRecords, $campaignIdMap);
        $settingStats = $this->importUserCampaignRuleSettings($userSettingRecords);

        $this->info('Import completed.');
        $this->line("Campaigns    — inserted: {$campaignStats['inserted']} | skipped: {$campaignStats['skipped']}");
        $this->line("Rules        — inserted: {$ruleStats['inserted']} | skipped: {$ruleStats['skipped']}");
        $this->line("Apply rules  — inserted: {$applyStats['inserted']} | skipped: {$applyStats['skipped']}");
        $this->line("User settings— inserted: {$settingStats['inserted']} | skipped: {$settingStats['skipped']}");

        return self::SUCCESS;
    }

    private function truncateTables(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        CampaignApplyRule::query()->truncate();
        CampaignRule::query()->truncate();
        Campaign::query()->truncate();
        UserCampaignRuleSetting::query()->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        $this->warn('Truncated campaign-related tables.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<string, true>  $validAccountIds
     * @return array{inserted: int, skipped: int}
     */
    private function importCampaigns(array $records, array $validAccountIds): array
    {
        $existingCampaignIds = DB::table('campaigns')
            ->select('campaign_id')
            ->pluck('campaign_id')
            ->flip()
            ->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $accountId = (string) ($record['account_id'] ?? '');
            $campaignId = (string) ($record['campaign_id'] ?? '');

            if ($accountId === '' || $campaignId === '') {
                $skipped++;

                continue;
            }

            if (! isset($validAccountIds[$accountId])) {
                $skipped++;

                continue;
            }

            if (isset($existingCampaignIds[$campaignId])) {
                $skipped++;

                continue;
            }

            $existingCampaignIds[$campaignId] = true;

            $batch[] = [
                'account_id' => $accountId,
                'ads_type' => (string) ($record['ads_type'] ?? 'facebook'),
                'campaign_id' => $campaignId,
                'campaign_name' => isset($record['campaign_name']) ? mb_substr((string) $record['campaign_name'], 0, 255) : null,
                'daily_budget' => is_numeric($record['daily_budget'] ?? null) ? (float) $record['daily_budget'] : null,
                'lifetime_budget' => is_numeric($record['lifetime_budget'] ?? null) ? (float) $record['lifetime_budget'] : null,
                'status' => isset($record['status']) ? mb_substr((string) $record['status'], 0, 50) : null,
                'start_time' => $this->normalizeTimestamp($record['start_time'] ?? null),
                'stop_time' => $this->normalizeTimestamp($record['stop_time'] ?? null),
                'created_by' => null,
                'updated_by' => null,
                'deleted_at' => $record['deleted_at'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                Campaign::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} campaigns...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            Campaign::query()->insert($batch);
            $inserted += count($batch);
        }

        return ['inserted' => $inserted, 'skipped' => $skipped];
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<string, int>  $userEmailMap
     * @return array{array{inserted: int, skipped: int}}
     */
    private function importCampaignRules(array $records, array $userEmailMap): array
    {
        $now = now();
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $email = (string) ($record['email'] ?? '');
            $codeRule = (string) ($record['code_rule'] ?? '');
            $id = (int) ($record['id'] ?? 0);

            $userId = $userEmailMap[$email] ?? null;

            if ($userId === null || $codeRule === '' || $id === 0) {
                $skipped++;

                continue;
            }

            [, $wasCreated] = $this->firstOrCreateRule($id, $userId, $codeRule, $record, $now);

            if ($wasCreated) {
                $inserted++;
            } else {
                $skipped++;
            }
        }

        return [['inserted' => $inserted, 'skipped' => $skipped]];
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array{CampaignRule, bool}
     */
    private function firstOrCreateRule(int $id, int $userId, string $codeRule, array $record, mixed $now): array
    {
        $existing = CampaignRule::query()->where('code_rule', $codeRule)->first();

        if ($existing !== null) {
            return [$existing, false];
        }

        $newRule = CampaignRule::query()->forceCreate([
            'id' => $id,
            'user_id' => $userId,
            'title' => mb_substr((string) ($record['title'] ?? ''), 0, 255),
            'code_rule' => $codeRule,
            'entity_type' => (string) ($record['entity_type'] ?? 'campaign'),
            'is_active' => (bool) ($record['is_active'] ?? true),
            'expired_at' => $this->normalizeTimestamp($record['expired_at'] ?? null),
            'min_roi' => is_numeric($record['min_roi'] ?? null) ? (float) $record['min_roi'] : null,
            'min_profit' => is_numeric($record['min_profit'] ?? null) ? (float) $record['min_profit'] : null,
            'min_revenue' => is_numeric($record['min_revenue'] ?? null) ? (float) $record['min_revenue'] : null,
            'min_spend' => is_numeric($record['min_spend'] ?? null) ? (float) $record['min_spend'] : null,
            'max_cpa' => is_numeric($record['max_cpa'] ?? null) ? (float) $record['max_cpa'] : null,
            'min_conversion' => is_numeric($record['min_conversion'] ?? null) ? (int) $record['min_conversion'] : null,
            'min_spend_adset' => is_numeric($record['min_spend_adset'] ?? null) ? (float) $record['min_spend_adset'] : null,
            'start_hour' => $this->normalizeHour($record['start_hour'] ?? null),
            'end_hour' => $this->normalizeHour($record['end_hour'] ?? null),
            'created_at' => $this->normalizeTimestamp($record['created_at'] ?? null) ?? $now,
            'updated_at' => $this->normalizeTimestamp($record['updated_at'] ?? null) ?? $now,
        ]);

        return [$newRule, true];
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<int, int>  $oldRuleIdMap  backup old rule id => new campaign_rules.id
     * @param  array<string, int>  $campaignIdMap  external campaign_id string => campaigns.id
     * @return array{inserted: int, skipped: int}
     */
    private function importCampaignApplyRules(array $records, array $campaignIdMap): array
    {
        $validRuleIds = DB::table('campaign_rules')
            ->select('id')
            ->pluck('id')
            ->flip()
            ->all();

        /** @var array<string, true> $existingPairs "sourceable_id_sourceable_type_rule_id" => true */
        $existingPairs = DB::table('campaign_apply_rules')
            ->select('sourceable_id', 'sourceable_type', 'campaign_rule_id')
            ->get()
            ->mapWithKeys(fn ($row): array => ["{$row->sourceable_id}_{$row->sourceable_type}_{$row->campaign_rule_id}" => true])
            ->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $ruleId = (int) ($record['campaign_rule_id'] ?? 0);
            $externalCampaignId = (string) ($record['campaign_id'] ?? '');
            $sourceableType = (string) ($record['sourceable_type'] ?? 'App\\Models\\Campaign');

            if (! isset($validRuleIds[$ruleId]) || ! isset($campaignIdMap[$externalCampaignId])) {
                $skipped++;

                continue;
            }

            $pairKey = "{$externalCampaignId}_{$sourceableType}_{$ruleId}";

            if (isset($existingPairs[$pairKey])) {
                $skipped++;

                continue;
            }

            $existingPairs[$pairKey] = true;

            $batch[] = [
                'campaign_rule_id' => $ruleId,
                'sourceable_type' => $sourceableType,
                'sourceable_id' => $externalCampaignId,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                DB::table('campaign_apply_rules')->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} campaign_apply_rules...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            DB::table('campaign_apply_rules')->insert($batch);
            $inserted += count($batch);
        }

        return ['inserted' => $inserted, 'skipped' => $skipped];
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @return array{inserted: int, skipped: int}
     */
    private function importUserCampaignRuleSettings(array $records): array
    {
        $existingUserIds = DB::table('user_campaign_rule_settings')
            ->select('user_id')
            ->pluck('user_id')
            ->flip()
            ->all();

        /** @var array<string, int> $userEmailMap email => users.id */
        $userEmailMap = DB::table('users')
            ->select('id', 'email')
            ->get()
            ->pluck('id', 'email')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $email = (string) ($record['email'] ?? '');
            $userId = $userEmailMap[$email] ?? null;

            if ($userId === null) {
                $skipped++;

                continue;
            }

            if (isset($existingUserIds[$userId])) {
                $skipped++;

                continue;
            }

            $existingUserIds[$userId] = true;

            $batch[] = [
                'user_id' => $userId,
                'campaign_rule_auto_enabled' => (bool) ($record['campaign_rule_auto_enabled'] ?? true),
                'action_mode' => (string) ($record['action_mode'] ?? 'pause'),
                'telegram_chat_id' => $record['telegram_chat_id'] ?? null,
                'created_at' => $this->normalizeTimestamp($record['created_at'] ?? null) ?? $now,
                'updated_at' => $this->normalizeTimestamp($record['updated_at'] ?? null) ?? $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                UserCampaignRuleSetting::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} user_campaign_rule_settings...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            UserCampaignRuleSetting::query()->insert($batch);
            $inserted += count($batch);
        }

        return ['inserted' => $inserted, 'skipped' => $skipped];
    }

    private function normalizeTimestamp(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeHour(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        // Backup stores HH:MM:SS, column is varchar(5) = HH:MM
        return mb_substr($value, 0, 5);
    }
}

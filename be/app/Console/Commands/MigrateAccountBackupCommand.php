<?php

namespace App\Console\Commands;

use App\Models\Account;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateAccountBackupCommand extends Command
{
    protected $signature = 'backup:migrate-accounts
        {--path= : Absolute path to accounts-backup.json}';

    protected $description = 'Migrate accounts backup JSON into accounts table';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/accounts-backup.json');

        if (! is_file($path)) {
            $this->error("Backup file not found: {$path}");

            return self::FAILURE;
        }

        /** @var array<int, array<string, mixed>> $records */
        $records = json_decode((string) file_get_contents($path), true) ?? [];

        if ($records === []) {
            $this->error('Backup JSON is empty or invalid.');

            return self::FAILURE;
        }

        $existingAccountIds = DB::table('accounts')->pluck('account_id')->flip()->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $accountId = (string) ($record['account_id'] ?? '');

            if ($accountId === '' || isset($existingAccountIds[$accountId])) {
                $skipped++;

                continue;
            }

            $batch[] = [
                'business_center_id' => null,
                'team_id' => null,
                'main_team_id' => 4,
                'account_id' => $accountId,
                'account_name' => isset($record['account_name']) ? mb_substr((string) $record['account_name'], 0, 255) : null,
                'ads_type' => (string) ($record['ads_type'] ?? 'facebook'),
                'status' => isset($record['status']) ? mb_substr((string) $record['status'], 0, 50) : null,
                'is_special' => (bool) ($record['is_special'] ?? false),
                'sync_to_mcc' => (bool) ($record['sync_to_mcc'] ?? false),
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                Account::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} accounts...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            Account::query()->insert($batch);
            $inserted += count($batch);
        }

        $this->info("Import completed. Inserted: {$inserted} | Skipped (duplicate account_id): {$skipped}");

        return self::SUCCESS;
    }
}

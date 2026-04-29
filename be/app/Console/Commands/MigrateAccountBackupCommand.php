<?php

namespace App\Console\Commands;

use App\Models\Account;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateAccountBackupCommand extends Command
{
    protected $signature = 'backup:migrate-accounts
        {--path= : Absolute path to accounts-backup.json}
        {--truncate : Truncate accounts table before importing}';

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

        if ((bool) $this->option('truncate')) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            Account::query()->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->warn('Truncated accounts table.');
        }

        $validBusinessCenterIds = $this->buildValidIdLookup('business_centers');
        $validTeamIds = $this->buildValidIdLookup('teams');
        $validUserIds = $this->buildValidIdLookup('users');
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
                'business_center_id' => $this->normalizeForeignId($record['business_center_id'] ?? null, $validBusinessCenterIds),
                'team_id' => $this->normalizeForeignId($record['team_id'] ?? null, $validTeamIds),
                'account_id' => $accountId,
                'account_name' => isset($record['account_name']) ? mb_substr((string) $record['account_name'], 0, 255) : null,
                'ads_type' => (string) ($record['ads_type'] ?? 'facebook'),
                'status' => isset($record['status']) ? mb_substr((string) $record['status'], 0, 50) : null,
                'is_special' => (bool) ($record['is_special'] ?? false),
                'sync_to_mcc' => (bool) ($record['sync_to_mcc'] ?? false),
                'created_by' => $this->normalizeForeignId($record['created_by'] ?? null, $validUserIds),
                'updated_by' => $this->normalizeForeignId($record['updated_by'] ?? null, $validUserIds),
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

    /**
     * @return array<int|string, true>
     */
    private function buildValidIdLookup(string $table): array
    {
        return DB::table($table)
            ->select('id')
            ->pluck('id')
            ->mapWithKeys(fn (mixed $id): array => [(int) $id => true])
            ->all();
    }

    /**
     * @param  array<int|string, true>  $lookup
     */
    private function normalizeForeignId(mixed $value, array $lookup): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        $id = (int) $value;

        return ($lookup[$id] ?? false) ? $id : null;
    }
}

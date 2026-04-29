<?php

namespace App\Console\Commands;

use App\Models\AccountUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateAccountUserBackupCommand extends Command
{
    protected $signature = 'backup:migrate-account-users
        {--path= : Absolute path to account-user-backup.json}
        {--truncate : Truncate account_user table before importing}';

    protected $description = 'Migrate account-user backup JSON into account_user table';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/account-user-backup.json');

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
            AccountUser::query()->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->warn('Truncated account_user table.');
        }

        /** @var array<string, int> $accountIdMap account_id (string) => accounts.id */
        $accountIdMap = DB::table('accounts')
            ->select('id', 'account_id')
            ->get()
            ->pluck('id', 'account_id')
            ->all();

        /** @var array<string, int> $userEmailMap email => users.id */
        $userEmailMap = DB::table('users')
            ->select('id', 'email')
            ->get()
            ->pluck('id', 'email')
            ->all();

        $existingPairs = DB::table('account_user')
            ->select('account_id', 'user_id')
            ->get()
            ->mapWithKeys(fn ($row): array => ["{$row->account_id}_{$row->user_id}" => true])
            ->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $rawAccountId = (string) ($record['account_id'] ?? '');
            $email = (string) ($record['email'] ?? '');

            $accountPk = $accountIdMap[$rawAccountId] ?? null;
            $userId = $userEmailMap[$email] ?? null;

            if ($accountPk === null || $userId === null) {
                $skipped++;

                continue;
            }

            $pairKey = "{$accountPk}_{$userId}";

            if (isset($existingPairs[$pairKey])) {
                $skipped++;

                continue;
            }

            $existingPairs[$pairKey] = true;

            $batch[] = [
                'account_id' => $accountPk,
                'user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                AccountUser::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} account_user rows...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            AccountUser::query()->insert($batch);
            $inserted += count($batch);
        }

        $this->info("Import completed. Inserted: {$inserted} | Skipped (not found or duplicate): {$skipped}");

        return self::SUCCESS;
    }
}

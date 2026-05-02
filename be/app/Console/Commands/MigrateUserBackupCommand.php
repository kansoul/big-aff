<?php

namespace App\Console\Commands;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateUserBackupCommand extends Command
{
    protected $signature = 'backup:migrate-users
        {--path= : Absolute path to users-backup.json}
        {--truncate : Truncate users table before importing}';

    protected $description = 'Migrate users backup JSON into users table';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/users-backup.json');

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
            User::query()->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->warn('Truncated users table.');
        }

        $validRoleIds = $this->buildValidIdLookup('roles');
        $validStyleIds = $this->buildValidIdLookup('styles');
        $existingEmails = DB::table('users')->pluck('email')->flip()->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $email = (string) ($record['email'] ?? '');

            if ($email === '' || isset($existingEmails[$email])) {
                $skipped++;

                continue;
            }

            $batch[] = [
                'role_id' => $this->normalizeForeignId($record['role_id'] ?? null, $validRoleIds),
                'style_id' => $this->normalizeForeignId($record['style_id'] ?? null, $validStyleIds),
                'name' => mb_substr((string) ($record['name'] ?? ''), 0, 255),
                'email' => $email,
                'email_verified_at' => isset($record['email_verified_at']) ? date('Y-m-d H:i:s', strtotime($record['email_verified_at'])) : null,
                'status' => UserStatus::Active,
                'password' => (string) ($record['password'] ?? ''),
                'description' => $record['description'] ?? null,
                'created_by' => 1,
                'updated_by' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                User::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} users...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            User::query()->insert($batch);
            $inserted += count($batch);
        }

        $this->info("Import completed. Inserted: {$inserted} | Skipped (duplicate email): {$skipped}");

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

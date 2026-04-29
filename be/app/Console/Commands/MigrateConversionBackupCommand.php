<?php

namespace App\Console\Commands;

use App\Models\Conversion;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateConversionBackupCommand extends Command
{
    protected $signature = 'backup:migrate-conversions
        {--path= : Absolute path to conversions-backup.json}
        {--truncate : Truncate conversions table before importing}';

    protected $description = 'Migrate conversions backup JSON file into conversions table';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/conversions-backup.json');

        if (! is_file($path)) {
            $this->error("Backup file not found: {$path}");

            return self::FAILURE;
        }

        /** @var array<int, array<string, mixed>> $records */
        $records = json_decode((string) file_get_contents($path), true) ?? [];

        if ((bool) $this->option('truncate')) {
            Conversion::query()->truncate();
            $this->warn('Truncated conversions table.');
        }

        /** @var array<string, true> $validAccountIds accounts.account_id => true */
        $validAccountIds = DB::table('accounts')
            ->select('account_id')
            ->pluck('account_id')
            ->flip()
            ->all();

        $stats = $this->importConversions($records, $validAccountIds);

        $this->info('Import completed.');
        $this->line("Conversions — inserted: {$stats['inserted']} | skipped: {$stats['skipped']}");

        return self::SUCCESS;
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<string, true>  $validAccountIds
     * @return array{inserted: int, skipped: int}
     */
    private function importConversions(array $records, array $validAccountIds): array
    {
        /** @var array<string, true> $existingAccountIds conversions.account_id => true */
        $existingAccountIds = DB::table('conversions')
            ->select('account_id')
            ->pluck('account_id')
            ->flip()
            ->all();

        $now = now();
        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $accountId = (string) ($record['account_id'] ?? '');

            if ($accountId === '') {
                $skipped++;

                continue;
            }

            if (! isset($validAccountIds[$accountId])) {
                $skipped++;

                continue;
            }

            if (isset($existingAccountIds[$accountId])) {
                $skipped++;

                continue;
            }

            $existingAccountIds[$accountId] = true;

            $batch[] = [
                'account_id' => $accountId,
                'article_view' => isset($record['article_view']) ? (string) $record['article_view'] : null,
                'rsu_click' => isset($record['rsu_click']) ? (string) $record['rsu_click'] : null,
                'search_view' => isset($record['search_view']) ? (string) $record['search_view'] : null,
                'search_click' => isset($record['search_click']) ? (string) $record['search_click'] : null,
                'created_at' => $this->normalizeTimestamp($record['created_at'] ?? null) ?? $now,
                'updated_at' => $this->normalizeTimestamp($record['updated_at'] ?? null) ?? $now,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                Conversion::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} conversions...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            Conversion::query()->insert($batch);
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
}

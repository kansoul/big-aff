<?php

namespace App\Console\Commands;

use App\Models\CampaignSchedule;
use App\Models\CampaignScheduleItem;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateCampaignScheduleBackupCommand extends Command
{
    protected $signature = 'backup:migrate-campaign-schedules
        {--schedules-path= : Absolute path to campaign_schedules-backup.json}
        {--items-path= : Absolute path to campaign_schedule_items-backup.json}
        {--truncate : Truncate campaign_schedule_items and campaign_schedules before importing}';

    protected $description = 'Migrate campaign schedule backup JSON files into campaign_schedules and campaign_schedule_items tables';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $schedulesPath = $this->option('schedules-path') ?: storage_path('app/backup/campaign_schedules-backup.json');
        $itemsPath = $this->option('items-path') ?: storage_path('app/backup/campaign_schedule_items-backup.json');

        foreach ([$schedulesPath, $itemsPath] as $path) {
            if (! is_file($path)) {
                $this->error("Backup file not found: {$path}");

                return self::FAILURE;
            }
        }

        /** @var array<int, array<string, mixed>> $scheduleRecords */
        $scheduleRecords = json_decode((string) file_get_contents($schedulesPath), true) ?? [];
        /** @var array<int, array<string, mixed>> $itemRecords */
        $itemRecords = json_decode((string) file_get_contents($itemsPath), true) ?? [];

        if ((bool) $this->option('truncate')) {
            $this->truncateTables();
        }

        /** @var array<string, int> $userEmailMap email => users.id */
        $userEmailMap = DB::table('users')
            ->select('id', 'email')
            ->get()
            ->pluck('id', 'email')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        /** @var array<string, true> $validCampaignIds campaigns.campaign_id => true */
        $validCampaignIds = DB::table('campaigns')
            ->select('campaign_id')
            ->pluck('campaign_id')
            ->flip()
            ->all();

        [$scheduleStats, $oldIdToNewId] = $this->importCampaignSchedules($scheduleRecords, $userEmailMap);
        $itemStats = $this->importCampaignScheduleItems($itemRecords, $oldIdToNewId, $validCampaignIds);

        $this->info('Import completed.');
        $this->line("Campaign schedules — inserted: {$scheduleStats['inserted']} | skipped: {$scheduleStats['skipped']}");
        $this->line("Schedule items     — inserted: {$itemStats['inserted']} | skipped: {$itemStats['skipped']}");

        return self::SUCCESS;
    }

    private function truncateTables(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        CampaignScheduleItem::query()->truncate();
        CampaignSchedule::query()->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        $this->warn('Truncated campaign schedule tables.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<string, int>  $userEmailMap
     * @return array{array{inserted: int, skipped: int}, array<int, int>}
     */
    private function importCampaignSchedules(array $records, array $userEmailMap): array
    {
        $now = now();
        $inserted = 0;
        $skipped = 0;

        /** @var array<int, int> $oldIdToNewId backup id => new campaign_schedules.id */
        $oldIdToNewId = [];

        foreach ($records as $record) {
            $email = (string) ($record['email'] ?? '');
            $oldId = (int) ($record['id'] ?? 0);
            $name = (string) ($record['name'] ?? '');

            $userId = $userEmailMap[$email] ?? null;

            if ($userId === null || $oldId === 0 || $name === '') {
                $skipped++;

                continue;
            }

            $newSchedule = CampaignSchedule::query()->forceCreate([
                'created_by' => $userId,
                'name' => mb_substr($name, 0, 255),
                'turn_on_time' => $this->normalizeTime($record['turn_on_time'] ?? null),
                'turn_off_time' => $this->normalizeTime($record['turn_off_time'] ?? null),
                'is_active' => (bool) ($record['is_active'] ?? false),
                'created_at' => $this->normalizeTimestamp($record['created_at'] ?? null) ?? $now,
                'updated_at' => $this->normalizeTimestamp($record['updated_at'] ?? null) ?? $now,
            ]);

            $oldIdToNewId[$oldId] = (int) $newSchedule->id;
            $inserted++;
        }

        return [['inserted' => $inserted, 'skipped' => $skipped], $oldIdToNewId];
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @param  array<int, int>  $oldIdToNewId
     * @param  array<string, true>  $validCampaignIds
     * @return array{inserted: int, skipped: int}
     */
    private function importCampaignScheduleItems(array $records, array $oldIdToNewId, array $validCampaignIds): array
    {
        /** @var array<string, true> $existingPairs "schedule_id_campaign_id" => true */
        $existingPairs = DB::table('campaign_schedule_items')
            ->select('campaign_schedule_id', 'campaign_id')
            ->get()
            ->mapWithKeys(fn ($row): array => ["{$row->campaign_schedule_id}_{$row->campaign_id}" => true])
            ->all();

        $batch = [];
        $inserted = 0;
        $skipped = 0;

        foreach ($records as $record) {
            $oldScheduleId = (int) ($record['campaign_schedule_id'] ?? 0);
            $campaignId = (string) ($record['campaign_id'] ?? '');

            $newScheduleId = $oldIdToNewId[$oldScheduleId] ?? null;

            if ($newScheduleId === null || $campaignId === '') {
                $skipped++;

                continue;
            }

            if (! isset($validCampaignIds[$campaignId])) {
                $skipped++;

                continue;
            }

            $pairKey = "{$newScheduleId}_{$campaignId}";

            if (isset($existingPairs[$pairKey])) {
                $skipped++;

                continue;
            }

            $existingPairs[$pairKey] = true;

            $batch[] = [
                'campaign_schedule_id' => $newScheduleId,
                'campaign_id' => $campaignId,
            ];

            if (count($batch) >= self::BATCH_SIZE) {
                CampaignScheduleItem::query()->insert($batch);
                $inserted += count($batch);
                $this->line("Inserted {$inserted} campaign_schedule_items...");
                $batch = [];
            }
        }

        if ($batch !== []) {
            CampaignScheduleItem::query()->insert($batch);
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

    private function normalizeTime(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return mb_substr($value, 0, 8);
    }
}

<?php

namespace App\Console\Commands;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Models\AdxConversion;
use App\Services\Integrations\Adx\AdxConversionSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncAdxConversionsCommand extends Command
{
    protected $signature = 'adx:sync-conversions';

    protected $description = 'Push pending ADX conversions to Google Ads';

    protected const BATCH_SIZE = 100;

    public function handle(AdxConversionSyncService $service): int
    {
        $synced = 0;
        $accountCache = [];
        $mappingCache = [];

        try {
            AdxConversion::query()
                ->where('sync_status', 'pending')
                ->where('source', 'google')
                ->whereNotNull('account_id')
                ->where(fn ($q) => $q->whereNotNull('gclid')->orWhereNotNull('gbraid')->orWhereNotNull('wbraid'))
                ->orderBy('id')
                ->chunkById(self::BATCH_SIZE, function ($chunk) use (&$synced, &$accountCache, &$mappingCache, $service): void {
                    $grouped = $chunk->groupBy('account_id');

                    foreach ($grouped as $accountId => $records) {
                        try {
                            if (! isset($accountCache[$accountId])) {
                                $accountCache[$accountId] = AdxAccount::query()
                                    ->where('source', 'google')
                                    ->where('account_id', $accountId)
                                    ->with('businessCenter')
                                    ->first();
                            }

                            $account = $accountCache[$accountId];
                            if (! $account || strtoupper((string) $account->status) !== 'ACTIVE') {
                                continue;
                            }

                            if (! isset($mappingCache[$accountId])) {
                                $mappingCache[$accountId] = AdxAccountConversion::query()
                                    ->where('source', 'google')
                                    ->where('account_id', $accountId)
                                    ->where('status', 'active')
                                    ->get()
                                    ->keyBy('conversion_type');
                            }

                            $conversionMappings = $mappingCache[$accountId];
                            $targetAccountId = ($account->sync_to_mcc && $account->businessCenter?->bc_id)
                                ? $account->businessCenter->bc_id
                                : $accountId;
                            $preTargetAccountId = preg_replace('/-/', '', (string) $targetAccountId);
                            $prepared = [];
                            $payload = [];

                            foreach ($records as $record) {
                                $accountConversion = $conversionMappings->get($record->conversion_type);
                                $conversionActionId = $record->conversion_action_id
                                    ?: $accountConversion?->conversion_action_id;

                                if (! $conversionActionId) {
                                    $record->update([
                                        'sync_status' => 'pending_account',
                                        'error_message' => '[no_action] No conversion_action_id resolved.',
                                    ]);

                                    continue;
                                }

                                $prepared[] = $record;
                                $payload[] = [
                                    'gclid' => $record->gclid,
                                    'wbraid' => $record->wbraid,
                                    'gbraid' => $record->gbraid,
                                    'conversion_action_resource_name' => "customers/{$preTargetAccountId}/conversionActions/{$conversionActionId}",
                                    'conversion_value' => $record->conversion_value,
                                    'currency_code' => $record->currency,
                                    'conversion_date_time' => $record->occurred_at->format('Y-m-d H:i:sP'),
                                ];
                            }

                            if (empty($payload)) {
                                continue;
                            }

                            $failedIndices = $service->syncAdxConversion($targetAccountId, $payload);

                            if (! is_array($failedIndices)) {
                                $this->error("Failed to sync ADX conversions for customer {$accountId}");

                                continue;
                            }

                            $successIds = [];
                            foreach ($prepared as $index => $record) {
                                if (! in_array($index, $failedIndices, true)) {
                                    $successIds[] = $record->id;
                                }
                            }

                            if (! empty($successIds)) {
                                AdxConversion::query()
                                    ->whereIn('id', $successIds)
                                    ->update([
                                        'sync_status' => 'synced',
                                        'synced_at' => now(),
                                        'error_message' => null,
                                    ]);

                                $synced += count($successIds);
                            }

                            foreach ($failedIndices as $index) {
                                if (! isset($prepared[$index])) {
                                    continue;
                                }

                                $prepared[$index]->update([
                                    'error_message' => 'Partial failure from Google Ads API.',
                                ]);
                            }

                            $this->info('Synced '.count($successIds).'/'.count($prepared)." ADX conversions for customer {$accountId}");
                        } catch (Throwable $e) {
                            Log::channel('sync_reports')->error('[AdxConversions] Account sync failed', [
                                'account_id' => $accountId,
                                'error' => $e->getMessage(),
                            ]);
                            $this->error("Error syncing ADX conversions for customer {$accountId}");
                        }
                    }

                    sleep(2);
                });

            $this->info("Synced {$synced} ADX conversions to Google Ads.");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdxConversions] Sync failed', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing ADX conversions: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Enums\AdsConversionType;
use App\Models\Account;
use App\Models\AdsConversion;
use App\Services\Integrations\Google\GoogleAdsConversionSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncGoogleConversions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'google-ads:sync-conversions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync unsynced ad revenues to Google Ads';

    protected const BATCH_SIZE = 2000;

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $accountCache = [];
        $googleAdsConversionSyncService = app(GoogleAdsConversionSyncService::class);

        AdsConversion::query()
            ->where('type', AdsConversionType::GOOGLE)
            ->whereNull('synced_at')
            ->chunkById(self::BATCH_SIZE, function ($chunk) use (&$accountCache, $googleAdsConversionSyncService) {
                $grouped = $chunk->groupBy('account_id');

                foreach ($grouped as $accountId => $records) {
                    try {
                        if (! isset($accountCache[$accountId])) {
                            $account = Account::where('account_id', $accountId)
                                ->with(['conversion', 'businessCenter'])
                                ->first();
                            $accountCache[$accountId] = $account;
                        }

                        $account = $accountCache[$accountId];

                        if (! $account || ! $account->conversion || $account->status !== 'ACTIVE') {
                            continue;
                        }

                        $conversion = $account->conversion;

                        $mapping = [
                            'page_view' => $conversion->page_view,
                            'redirect' => $conversion->redirect,
                            'submit_form' => $conversion->submit_form,
                        ];

                        $validRecords = $records->map(function ($record) use ($accountId, $mapping) {
                            $eventName = $record->conversion_action_resource_name;

                            if (! isset($mapping[$eventName]) || empty($mapping[$eventName])) {
                                return null;
                            }

                            $conversionActionId = $mapping[$eventName];
                            $record->real_resource_name = "customers/{$accountId}/conversionActions/{$conversionActionId}";

                            return $record;
                        })->filter()->values();

                        if ($validRecords->isEmpty()) {
                            continue;
                        }

                        $adRevenuesPayload = $validRecords->map(function ($record) {
                            return [
                                'gclid' => $record->gclid,
                                'wbraid' => $record->wbraid,
                                'gbraid' => $record->gbraid,
                                'conversion_action_resource_name' => $record->real_resource_name,
                                'conversion_value' => $record->conversion_value,
                                'currency_code' => $record->currency_code ?: 'USD',
                                'conversion_date_time' => $record->conversion_date_time,
                            ];
                        })->toArray();

                        $targetaccountId = ($account->sync_to_mcc && $account->businessCenter?->bc_id)
                            ? $account->businessCenter->bc_id
                            : $accountId;

                        $failedIndices = $googleAdsConversionSyncService->syncAdsConversion($targetaccountId, $adRevenuesPayload);

                        if (is_array($failedIndices)) {
                            $idsToUpdate = [];
                            foreach ($validRecords as $index => $record) {
                                if (! in_array($index, $failedIndices)) {
                                    $idsToUpdate[] = $record->id;
                                }
                            }

                            if (! empty($idsToUpdate)) {
                                AdsConversion::whereIn('id', $idsToUpdate)->update(['synced_at' => now()]);
                                $successCount = count($idsToUpdate);
                                $totalCount = $validRecords->count();
                                $this->info("Synced {$successCount}/{$totalCount} records for customer {$accountId}");
                            }
                        } else {
                            $this->error("Failed to sync records for customer {$accountId}");
                        }
                    } catch (Throwable $e) {
                        Log::error("Error processing ad revenue sync for customer {$accountId}: ".$e->getMessage());
                        $this->error("Error syncing customer {$accountId}");
                    }
                }
                sleep(2);
            });
    }
}

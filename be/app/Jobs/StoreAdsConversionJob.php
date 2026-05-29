<?php

namespace App\Jobs;

use App\Models\AdsConversion;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class StoreAdsConversionJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public array $data, public string $conversionDateTime)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            AdsConversion::create([
                'account_id' => $this->data['account_id'],
                'campaign_id' => $this->data['campaign_id'] ?? null,
                'gclid' => $this->data['gclid'] ?? null,
                'wbraid' => $this->data['wbraid'] ?? null,
                'gbraid' => $this->data['gbraid'] ?? null,
                'conversion_action_resource_name' => $this->data['conversion_action_resource_name'],
                'conversion_value' => $this->data['conversion_value'] ?? null,
                'currency_code' => $this->data['currency_code'] ?? null,
                'conversion_date_time' => $this->conversionDateTime,
            ]);
        } catch (Throwable $e) {
            Log::error('AdRevenue job error: '.$e->getMessage());
        }
    }
}

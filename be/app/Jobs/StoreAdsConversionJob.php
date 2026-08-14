<?php

namespace App\Jobs;

use App\Enums\AdsConversionType;
use App\Models\AdsConversion;
use App\Models\TrackingSession;
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
            $session = isset($this->data['session_id'])
                ? TrackingSession::where('session_id', $this->data['session_id'])->first()
                : null;
            $ipAddress = null;
            $userAgent = null;
            if ($session) {
                $ipAddress = $session->ip_address;
                $userAgent = $session->user_agent;
            }
            AdsConversion::create([
                'account_id' => $this->data['account_id'],
                'type' => $this->data['type'] ?? AdsConversionType::GOOGLE->value,
                'campaign_id' => $this->data['campaign_id'] ?? null,
                'gclid' => $this->data['gclid'] ?? null,
                'wbraid' => $this->data['wbraid'] ?? null,
                'gbraid' => $this->data['gbraid'] ?? null,
                'ttclid' => $this->data['ttclid'] ?? null,
                'session_id' => $this->data['session_id'] ?? null,
                'conversion_action_resource_name' => $this->data['conversion_action_resource_name'],
                'conversion_value' => $this->data['conversion_value'] ?? null,
                'currency_code' => $this->data['currency_code'] ?? null,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'conversion_date_time' => $this->conversionDateTime,
            ]);
        } catch (Throwable $e) {
            Log::error('AdRevenue job error: '.$e->getMessage());
        }
    }
}

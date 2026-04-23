<?php

namespace App\Jobs;

use App\Actions\CampaignRule\EvaluateAdAdsetRuleAction;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EvaluateAdAdsetRuleJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public int $uniqueFor = 300;

    /**
     * @param  class-string<AdsInsightsReport|AdsetInsightsReport>  $entityType
     */
    public function __construct(
        public readonly string $entityType,
        public readonly string $entityId,
        public readonly ?string $date = null,
    ) {
        $this->onQueue('automation-off-campaign');
    }

    public function uniqueId(): string
    {
        return implode(':', [
            'automation_off_ad_adset',
            $this->entityType,
            $this->entityId,
            $this->date ?? 'today',
        ]);
    }

    public function handle(EvaluateAdAdsetRuleAction $action): void
    {
        $action->execute($this->entityType, $this->entityId, $this->date);
    }
}

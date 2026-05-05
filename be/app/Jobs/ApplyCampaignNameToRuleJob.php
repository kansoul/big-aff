<?php

namespace App\Jobs;

use App\Actions\CampaignRule\AutoMatchCampaignRulesAction;
use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ApplyCampaignNameToRuleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /**
     * @param  array<int>  $campaignIds
     */
    public function __construct(
        protected array $campaignIds,
    ) {
        $this->onQueue('apply-campaign-name-to-rule');
    }

    public function handle(AutoMatchCampaignRulesAction $action): void
    {
        $campaigns = Campaign::whereIn('campaign_id', $this->campaignIds)->get();
        $action->execute($campaigns);
    }
}

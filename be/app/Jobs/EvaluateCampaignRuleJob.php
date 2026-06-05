<?php

namespace App\Jobs;

use App\Actions\CampaignRule\EvaluateCampaignRuleAction;
use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EvaluateCampaignRuleJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public int $uniqueFor = 1800;

    public function __construct(
        protected Campaign $campaign,
        protected string $date,
    ) {
        $this->onQueue('automation-off-campaign');
    }

    public function uniqueId(): string
    {
        return $this->campaign->id.'_'.$this->date;
    }

    public function handle(EvaluateCampaignRuleAction $action): void
    {
        $action->execute($this->campaign, $this->date);
    }
}

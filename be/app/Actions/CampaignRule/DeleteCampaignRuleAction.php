<?php

namespace App\Actions\CampaignRule;

use App\Models\CampaignRule;
use App\Support\OwnerResource\CampaignRuleOwnerResource;

class DeleteCampaignRuleAction
{
    public function execute(CampaignRule $rule): void
    {
        (new CampaignRuleOwnerResource)->authorize($rule);

        $rule->delete();
    }
}

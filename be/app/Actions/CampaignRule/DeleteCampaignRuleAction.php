<?php

namespace App\Actions\CampaignRule;

use App\Models\CampaignRule;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteCampaignRuleAction
{
    public function execute(CampaignRule $rule): void
    {
        OwnershipFilter::forAuthUser()->authorize($rule->user_id);

        $rule->delete();
    }
}

<?php

namespace App\Services\Campaign;

use App\Actions\Campaign\ListCampaignSelectorAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CampaignService
{
    public function __construct(
        private readonly ListCampaignSelectorAction $listCampaignSelectorAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listCampaignSelectorAction(array $filters): LengthAwarePaginator
    {
        return $this->listCampaignSelectorAction->execute($filters);
    }
}

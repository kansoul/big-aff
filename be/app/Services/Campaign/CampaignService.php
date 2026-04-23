<?php

namespace App\Services\Campaign;

use App\Actions\Campaign\ListAdsetSelectorAction;
use App\Actions\Campaign\ListAdsSelectorAction;
use App\Actions\Campaign\ListCampaignSelectorAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CampaignService
{
    public function __construct(
        private readonly ListAdsetSelectorAction $listAdsetSelectorAction,
        private readonly ListAdsSelectorAction $listAdsSelectorAction,
        private readonly ListCampaignSelectorAction $listCampaignSelectorAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listCampaignSelectorAction(array $filters): LengthAwarePaginator
    {
        return $this->listCampaignSelectorAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listAdsetSelectorAction(array $filters): LengthAwarePaginator
    {
        return $this->listAdsetSelectorAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listAdsSelectorAction(array $filters): LengthAwarePaginator
    {
        return $this->listAdsSelectorAction->execute($filters);
    }
}

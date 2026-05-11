<?php

namespace App\Services\Adx;

use App\Actions\Adx\LinkData\ListAdxCampaignsAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdxCampaignService
{
    public function __construct(
        private readonly ListAdxCampaignsAction $listCampaignsAction,
    ) {}

    public function listCampaigns(array $filters): LengthAwarePaginator
    {
        return $this->listCampaignsAction->execute($filters);
    }
}

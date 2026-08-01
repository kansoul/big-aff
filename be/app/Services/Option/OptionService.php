<?php

namespace App\Services\Option;

use App\Actions\Account\GetAccountOptionsAction;
use App\Actions\BusinessCenter\GetBusinessCenterOptionsAction;
use App\Actions\Option\GetAdsReportOptionsAction;
use App\Actions\Option\GetSiteOptionsAction;
use App\Actions\Option\GetTeamOptionsAction;
use App\Actions\Option\GetUserOptionsAction;
use Illuminate\Support\Collection;

class OptionService
{
    public function __construct(
        private readonly GetUserOptionsAction $getUserOptions,
        private readonly GetSiteOptionsAction $getSiteOptions,
        private readonly GetAccountOptionsAction $getAccountOptions,
        private readonly GetTeamOptionsAction $getTeamOptions,
        private readonly GetBusinessCenterOptionsAction $getBusinessCenterOptions,
        private readonly GetAdsReportOptionsAction $getAdsReportOptions,
    ) {}

    /** @return Collection<int, array{id: int, name: string, email: string}> */
    public function users(): Collection
    {
        return $this->getUserOptions->execute();
    }

    /** @return Collection<int, array{id: int, name: string}> */
    public function sites(): Collection
    {
        return $this->getSiteOptions->execute();
    }

    /** @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}> */
    public function accounts(?int $userId = null): Collection
    {
        return $this->getAccountOptions->execute($userId);
    }

    /** @return Collection<int, array{id: int, name: string}> */
    public function teams(): Collection
    {
        return $this->getTeamOptions->execute();
    }

    /** @return Collection<int, array{id: int, name: string}> */
    public function businessCenters(): Collection
    {
        return $this->getBusinessCenterOptions->execute();
    }

    /** @return array{can_view_unscoped: bool, show_team_filter: bool, main_teams: Collection, accounts: Collection, teams: Collection, campaigns: Collection} */
    public function adsReport(): array
    {
        return $this->getAdsReportOptions->execute();
    }
}

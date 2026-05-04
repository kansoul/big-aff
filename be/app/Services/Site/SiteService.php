<?php

namespace App\Services\Site;

use App\Actions\Site\AssignSiteAction;
use App\Actions\Site\ConfigSiteAction;
use App\Actions\Site\CreateSiteAction;
use App\Actions\Site\DeleteSiteAction;
use App\Actions\Site\GetSiteUserOptionsAction;
use App\Actions\Site\ListSitesAction;
use App\Actions\Site\UpdateSiteAction;
use App\Models\Site;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class SiteService
{
    public function __construct(
        private readonly CreateSiteAction $createSiteAction,
        private readonly UpdateSiteAction $updateSiteAction,
        private readonly DeleteSiteAction $deleteSiteAction,
        private readonly ListSitesAction $listSitesAction,
        private readonly AssignSiteAction $assignSiteAction,
        private readonly GetSiteUserOptionsAction $getSiteUserOptionsAction,
        private readonly ConfigSiteAction $configSiteAction
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listSitesAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Site
    {
        return $this->createSiteAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Site $site, array $data): Site
    {
        return $this->updateSiteAction->execute($site, $data);
    }

    public function delete(Site $site): void
    {
        $this->deleteSiteAction->execute($site);
    }

    /**
     * @param  array<int>  $userIds
     */
    public function assign(Site $site, array $userIds): void
    {
        $this->assignSiteAction->execute($site, $userIds);
    }

    /**
     * @return array{options: Collection<int, array{id: int, name: string, email: string}>, assigned_user_ids: array<int>}
     */
    public function userOptions(Site $site): array
    {
        return $this->getSiteUserOptionsAction->execute($site);
    }

    public function config(string $domain): ?Site
    {
        return $this->configSiteAction->execute($domain);
    }
}

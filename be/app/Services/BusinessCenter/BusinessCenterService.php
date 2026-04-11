<?php

namespace App\Services\BusinessCenter;

use App\Actions\BusinessCenter\CreateBusinessCenterAction;
use App\Actions\BusinessCenter\DeleteBusinessCenterAction;
use App\Actions\BusinessCenter\GetBusinessCenterOptionsAction;
use App\Actions\BusinessCenter\ListBusinessCentersAction;
use App\Actions\BusinessCenter\UpdateBusinessCenterAction;
use App\Models\BusinessCenter;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class BusinessCenterService
{
    public function __construct(
        private readonly ListBusinessCentersAction $listBusinessCentersAction,
        private readonly CreateBusinessCenterAction $createBusinessCenterAction,
        private readonly UpdateBusinessCenterAction $updateBusinessCenterAction,
        private readonly DeleteBusinessCenterAction $deleteBusinessCenterAction,
        private readonly GetBusinessCenterOptionsAction $getBusinessCenterOptionsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listBusinessCentersAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): BusinessCenter
    {
        return $this->createBusinessCenterAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(BusinessCenter $businessCenter, array $data): BusinessCenter
    {
        return $this->updateBusinessCenterAction->execute($businessCenter, $data);
    }

    public function delete(BusinessCenter $businessCenter): void
    {
        $this->deleteBusinessCenterAction->execute($businessCenter);
    }

    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function options(): Collection
    {
        return $this->getBusinessCenterOptionsAction->execute();
    }
}

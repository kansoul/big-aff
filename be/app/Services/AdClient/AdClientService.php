<?php

namespace App\Services\AdClient;

use App\Actions\AdClient\CreateAdClientAction;
use App\Actions\AdClient\DeleteAdClientAction;
use App\Actions\AdClient\ListAdClientsAction;
use App\Actions\AdClient\UpdateAdClientAction;
use App\Models\AdClient;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdClientService
{
    public function __construct(
        private readonly ListAdClientsAction $listAdClientsAction,
        private readonly CreateAdClientAction $createAdClientAction,
        private readonly UpdateAdClientAction $updateAdClientAction,
        private readonly DeleteAdClientAction $deleteAdClientAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAdClientsAction->execute($filters);
    }

    public function create(array $data): AdClient
    {
        return $this->createAdClientAction->execute($data);
    }

    public function update(AdClient $adClient, array $data): AdClient
    {
        return $this->updateAdClientAction->execute($adClient, $data);
    }

    public function delete(AdClient $adClient): void
    {
        $this->deleteAdClientAction->execute($adClient);
    }
}

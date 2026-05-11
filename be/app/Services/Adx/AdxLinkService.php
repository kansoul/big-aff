<?php

namespace App\Services\Adx;

use App\Actions\Adx\Link\CreateAdxLinkAction;
use App\Actions\Adx\Link\DeleteAdxLinkAction;
use App\Actions\Adx\Link\ListAdxLinksAction;
use App\Actions\Adx\Link\UpdateAdxLinkAction;
use App\Models\AdxLink;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdxLinkService
{
    public function __construct(
        private readonly ListAdxLinksAction $listAction,
        private readonly CreateAdxLinkAction $createAction,
        private readonly UpdateAdxLinkAction $updateAction,
        private readonly DeleteAdxLinkAction $deleteAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    public function create(array $data): AdxLink
    {
        return $this->createAction->execute($data);
    }

    public function update(AdxLink $link, array $data): AdxLink
    {
        return $this->updateAction->execute($link, $data);
    }

    public function delete(AdxLink $link): void
    {
        $this->deleteAction->execute($link);
    }
}

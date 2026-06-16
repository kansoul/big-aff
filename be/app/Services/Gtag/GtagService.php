<?php

namespace App\Services\Gtag;

use App\Actions\Gtag\BulkUpdateGtagsAction;
use App\Actions\Gtag\ImportGtagsAction;
use App\Actions\Gtag\ListGtagsAction;
use App\Actions\Gtag\UpdateGtagAction;
use App\Models\Account;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class GtagService
{
    public function __construct(
        private readonly ListGtagsAction $listAction,
        private readonly UpdateGtagAction $updateAction,
        private readonly BulkUpdateGtagsAction $bulkUpdateAction,
        private readonly ImportGtagsAction $importAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    public function update(Account $account, array $data): Account
    {
        return $this->updateAction->execute($account, $data);
    }

    public function bulkUpdate(array $rows): void
    {
        $this->bulkUpdateAction->execute($rows);
    }

    public function import(string $rawData): array
    {
        return $this->importAction->execute($rawData);
    }
}

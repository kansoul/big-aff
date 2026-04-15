<?php

namespace App\Services\GoogleConversion;

use App\Actions\GoogleConversion\BulkUpdateGoogleConversionsAction;
use App\Actions\GoogleConversion\ImportGoogleConversionsAction;
use App\Actions\GoogleConversion\ListGoogleConversionsAction;
use App\Actions\GoogleConversion\UpdateGoogleConversionAction;
use App\Models\Account;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class GoogleConversionService
{
    public function __construct(
        private readonly ListGoogleConversionsAction $listAction,
        private readonly UpdateGoogleConversionAction $updateAction,
        private readonly BulkUpdateGoogleConversionsAction $bulkUpdateAction,
        private readonly ImportGoogleConversionsAction $importAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Account $account, array $data): Account
    {
        return $this->updateAction->execute($account, $data);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function bulkUpdate(array $rows): void
    {
        $this->bulkUpdateAction->execute($rows);
    }

    /**
     * @return array{processed: int, skipped: int}
     */
    public function import(string $rawData): array
    {
        return $this->importAction->execute($rawData);
    }
}

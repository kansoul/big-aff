<?php

namespace App\Services\Adx;

use App\Actions\Adx\AccountConversion\DeleteAdxAccountConversionAction;
use App\Actions\Adx\AccountConversion\ListAdxAccountConversionsAction;
use App\Actions\Adx\AccountConversion\UpdateAdxAccountConversionAction;
use App\Actions\Adx\AccountConversion\UpsertAdxAccountConversionAction;
use App\Models\AdxAccountConversion;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdxAccountConversionService
{
    public function __construct(
        private readonly ListAdxAccountConversionsAction $listAction,
        private readonly UpsertAdxAccountConversionAction $upsertAction,
        private readonly UpdateAdxAccountConversionAction $updateAction,
        private readonly DeleteAdxAccountConversionAction $deleteAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    public function upsert(array $data): AdxAccountConversion
    {
        return $this->upsertAction->execute($data);
    }

    public function update(AdxAccountConversion $conversion, array $data): AdxAccountConversion
    {
        return $this->updateAction->execute($conversion, $data);
    }

    public function delete(AdxAccountConversion $conversion): void
    {
        $this->deleteAction->execute($conversion);
    }
}

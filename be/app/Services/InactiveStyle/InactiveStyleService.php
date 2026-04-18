<?php

namespace App\Services\InactiveStyle;

use App\Actions\InactiveStyle\BulkClearInactiveStylesAction;
use App\Actions\InactiveStyle\ClearInactiveStyleAction;
use App\Actions\InactiveStyle\ListInactiveStylesAction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class InactiveStyleService
{
    public function __construct(
        private readonly ListInactiveStylesAction $listInactiveStylesAction,
        private readonly ClearInactiveStyleAction $clearInactiveStyleAction,
        private readonly BulkClearInactiveStylesAction $bulkClearInactiveStylesAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listInactiveStylesAction->execute($filters);
    }

    public function clear(User $user): void
    {
        $this->clearInactiveStyleAction->execute($user);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function bulkClear(array $filters): int
    {
        return $this->bulkClearInactiveStylesAction->execute($filters);
    }
}

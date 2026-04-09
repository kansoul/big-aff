<?php

namespace App\Services\Style;

use App\Actions\Style\BulkCreateStylesAction;
use App\Actions\Style\DeleteStyleAction;
use App\Actions\Style\ListStylesAction;
use App\Models\Style;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class StyleService
{
    public function __construct(
        private readonly ListStylesAction $listStylesAction,
        private readonly BulkCreateStylesAction $bulkCreateStylesAction,
        private readonly DeleteStyleAction $deleteStyleAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters, User $user): LengthAwarePaginator
    {
        return $this->listStylesAction->execute($filters, $user);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<Style>, errors: list<string>}
     */
    public function bulkCreate(array $data): array
    {
        return $this->bulkCreateStylesAction->execute($data);
    }

    public function delete(Style $style): void
    {
        $this->deleteStyleAction->execute($style);
    }
}

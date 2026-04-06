<?php

namespace App\Services\User;

use App\Actions\User\ListParentChildAssignmentsAction;
use App\Actions\User\SyncUserParentChildrenAction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;

class UserParentChildService
{
    public function __construct(
        private readonly ListParentChildAssignmentsAction $listParentChildAssignmentsAction,
        private readonly SyncUserParentChildrenAction $syncUserParentChildrenAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{assignments: LengthAwarePaginator, user_options: Paginator}
     */
    public function listAssignments(User $actor, array $filters): array
    {
        return $this->listParentChildAssignmentsAction->execute($actor, $filters);
    }

    /**
     * @param  list<int>|null  $childIds
     */
    public function syncChildren(User $actor, User $parent, ?array $childIds): void
    {
        $this->syncUserParentChildrenAction->execute($actor, $parent, $childIds);
    }
}

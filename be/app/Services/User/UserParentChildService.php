<?php

namespace App\Services\User;

use App\Actions\User\BuildParentChildAssignmentsPayloadAction;
use App\Actions\User\ListParentChildAssignmentsAction;
use App\Actions\User\SyncUserParentChildrenAction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;

class UserParentChildService
{
    public function __construct(
        private readonly BuildParentChildAssignmentsPayloadAction $buildParentChildAssignmentsPayloadAction,
        private readonly ListParentChildAssignmentsAction $listParentChildAssignmentsAction,
        private readonly SyncUserParentChildrenAction $syncUserParentChildrenAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{assignments: LengthAwarePaginator, user_options: Paginator}
     */
    public function listAssignments(array $filters): array
    {
        return $this->listParentChildAssignmentsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function listAssignmentsPayload(array $filters): array
    {
        return $this->buildParentChildAssignmentsPayloadAction->execute(
            $this->listAssignments($filters),
        );
    }

    /**
     * @param  list<int>|null  $childIds
     */
    public function syncChildren(User $parent, ?array $childIds): void
    {
        $this->syncUserParentChildrenAction->execute($parent, $childIds);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function syncChildrenAndListAssignmentsPayload(User $user, array $data): array
    {
        $this->syncChildren($user, $data['child_ids'] ?? null);

        return $this->listAssignmentsPayload($data);
    }
}

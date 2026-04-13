<?php

namespace App\Services\User;

use App\Actions\User\GetUserTeamMemberOptionsAction;
use App\Actions\User\ListParentChildAssignmentsAction;
use App\Actions\User\SyncUserParentChildrenAction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Support\Collection;

class UserParentChildService
{
    public function __construct(
        private readonly ListParentChildAssignmentsAction $listParentChildAssignmentsAction,
        private readonly SyncUserParentChildrenAction $syncUserParentChildrenAction,
        private readonly GetUserTeamMemberOptionsAction $getUserTeamMemberOptionsAction,
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
     * @param  list<int>|null  $childIds
     */
    public function syncChildren(User $parent, ?array $childIds): void
    {
        $this->syncUserParentChildrenAction->execute($parent, $childIds);
    }

    /**
     * @return Collection<int, array{id: int, name: string, email: string, is_assigned_child: bool}>
     */
    public function teamMemberOptions(Team $team): Collection
    {
        return $this->getUserTeamMemberOptionsAction->execute($team);
    }
}

<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;

class ListParentChildAssignmentsAction
{
    public const array ORDERABLE_COLUMNS = ['id', 'name', 'email', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     * @return array{assignments: LengthAwarePaginator, user_options: Paginator}
     */
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $assignmentsQuery = $this->leaderUsersQuery($ownership);

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'name',
            defaultDirection: 'asc',
        )->applyTo($assignmentsQuery);

        $assignmentsPaginator = PaginationInput::fromValidatedArray($filters)->paginateQuery($assignmentsQuery);

        $parentIds = collect($assignmentsPaginator->items())->pluck('id')->all();

        // Load all child links for the current page of parents in one query.
        /** @var array<int, list<int>> $childrenByParent */
        $childrenByParent = [];
        if ($parentIds !== []) {
            $rows = UserParentChild::query()
                ->whereIn('parent_user_id', $parentIds)
                ->get(['parent_user_id', 'child_user_id']);

            foreach ($rows as $row) {
                $pid = (int) $row->parent_user_id;
                $childrenByParent[$pid] ??= [];
                $childrenByParent[$pid][] = (int) $row->child_user_id;
            }
        }

        $assignmentsPaginator = $assignmentsPaginator->through(function (User $user) use ($childrenByParent): array {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'child_user_ids' => array_values($childrenByParent[$user->id] ?? []),
            ];
        });

        // Options: all visible users who are a leader or member in a team (eligible to be children).
        $assignedChildIds = UserParentChild::query()
            ->pluck('child_user_id')
            ->map(fn($id) => (int) $id)
            ->all();

        $optionsQuery = $this->teamMemberUsersQuery($ownership)
            ->orderBy('name')
            ->orderBy('id');

        $optionsPaginator = PaginationInput::fromValidatedArray($filters, prefix: 'options_')
            ->simplePaginateQuery($optionsQuery, pageName: 'options_page');

        $optionsPaginator = $optionsPaginator->through(fn(User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_assigned_child' => \in_array($user->id, $assignedChildIds, true),
        ]);

        return [
            'assignments' => $assignmentsPaginator,
            'user_options' => $optionsPaginator,
        ];
    }

    /**
     * Users who are leaders in at least one team — the only users who can be parents.
     *
     * @return Builder<User>
     */
    private function leaderUsersQuery(OwnershipFilter $ownership): Builder
    {
        $leaderUserIds = TeamUser::query()
            ->where('team_role', TeamRole::LEADER->value)
            ->select('user_id');

        $query = User::query()
            ->with(['role', 'assignedParentLink.parentUser'])
            ->whereIn('id', $leaderUserIds);

        if (! $ownership->isAdmin()) {
            $query->whereIn('id', $ownership->allowedUserIds());
        }

        return $query;
    }

    /**
     * Users who are a leader or member in any team — eligible to be assigned as children.
     *
     * @return Builder<User>
     */
    private function teamMemberUsersQuery(OwnershipFilter $ownership): Builder
    {
        $memberUserIds = TeamUser::query()
            ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
            ->select('user_id');

        $query = User::query()->whereIn('id', $memberUserIds);

        if (! $ownership->isAdmin()) {
            $query->whereIn('id', $ownership->allowedUserIds());
        }

        return $query;
    }
}

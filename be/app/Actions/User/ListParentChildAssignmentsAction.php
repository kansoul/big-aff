<?php

namespace App\Actions\User;

use App\Models\User;
use App\Models\UserParentChild;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;

class ListParentChildAssignmentsAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array{assignments: LengthAwarePaginator, user_options: Paginator}
     */
    public function execute(User $actor, array $filters): array
    {
        $assignmentsQuery = $this->usersVisibleToActorQuery($actor)
            ->whereNotIn('id', UserParentChild::query()->select('child_user_id'));

        SortInput::fromValidatedArray(
            $filters,
            ListUsersAction::ORDERABLE_COLUMNS,
            defaultColumn: 'name',
            defaultDirection: 'asc',
        )->applyTo($assignmentsQuery);

        $assignmentsPaginator = PaginationInput::fromValidatedArray($filters)->paginateQuery($assignmentsQuery);

        $parentIds = collect($assignmentsPaginator->items())->pluck('id')->all();

        /** @var array<int, list<int>> $byParent */
        $byParent = [];
        if ($parentIds !== []) {
            $rows = UserParentChild::query()
                ->whereIn('parent_user_id', $parentIds)
                ->get(['parent_user_id', 'child_user_id']);
            foreach ($rows as $row) {
                $pid = (int) $row->parent_user_id;
                $byParent[$pid] ??= [];
                $byParent[$pid][] = (int) $row->child_user_id;
            }
        }

        $assignmentsPaginator = $assignmentsPaginator->through(function (User $user) use ($byParent): array {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'can_be_parent' => true,
                'child_user_ids' => array_values($byParent[$user->id] ?? []),
            ];
        });

        /** @var list<int> $childIdsSet */
        $childIdsSet = UserParentChild::query()
            ->pluck('child_user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $optionsQuery = $this->usersVisibleToActorQuery($actor)
            ->orderBy('name')
            ->orderBy('id');

        $optionsPagination = PaginationInput::fromValidatedArray($filters, prefix: 'options_');
        $optionsPaginator = $optionsPagination->simplePaginateQuery($optionsQuery, pageName: 'options_page');

        $optionsPaginator = $optionsPaginator->through(function (User $user) use ($childIdsSet): array {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_assigned_child' => in_array($user->id, $childIdsSet, true),
            ];
        });

        return [
            'assignments' => $assignmentsPaginator,
            'user_options' => $optionsPaginator,
        ];
    }

    /**
     * @return Builder<User>
     */
    private function usersVisibleToActorQuery(User $actor): Builder
    {
        $query = User::query()
            ->with(['role', 'assignedParentLink.parentUser']);

        if (! $actor->managesAllUsers()) {
            $query->whereIn('id', $actor->manageableUserIds());
        }

        return $query;
    }
}

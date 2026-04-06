<?php

namespace App\Actions\User;

use App\Models\User;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListUsersAction
{
    /**
     * Columns allowed for `order_by` (must match {@see ListUsersRequest} rules).
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'name',
        'email',
        'role_id',
        'status',
        'created_at',
        'updated_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(User $auth, array $filters): LengthAwarePaginator
    {
        $query = User::query()
            ->with(['role', 'assignedParentLink.parentUser']);

        if (! $auth->managesAllUsers()) {
            $query->whereIn('id', $auth->manageableUserIds());
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'name',
            defaultDirection: 'asc',
        )->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($filters);

        return $pagination->paginateQuery($query);
    }
}

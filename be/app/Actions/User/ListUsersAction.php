<?php

namespace App\Actions\User;

use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
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
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = User::query()->with(['role', 'assignedParentLink.parentUser', 'accounts.businessCenter', 'accounts.team']);

        (new UserOwnerResource)->applyTo($query);

        if (! empty($filters['keyword'])) {
            $keyword = $filters['keyword'];
            $query->where(function ($query) use ($keyword): void {
                $query->where('users.name', 'like', "%{$keyword}%")
                    ->orWhere('users.email', 'like', "%{$keyword}%");
            });
        }

        if (! empty($filters['role_id'])) {
            $query->where('users.role_id', $filters['role_id']);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'asc',
        )->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($filters);

        return $pagination->paginateQuery($query);
    }
}

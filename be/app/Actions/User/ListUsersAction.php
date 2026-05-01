<?php

namespace App\Actions\User;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

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
        $ownership = OwnershipFilter::forAuthUser();
        $query = User::query()->with(['role', 'style', 'assignedParentLink.parentUser', 'accounts.businessCenter', 'accounts.team']);

        $query->when(! $ownership->isAdmin(), function ($q) use ($ownership): void {
            $allowedIds = $ownership->allowedUserIds();
            $authId = (int) Auth::id();
            $q->where(function ($q) use ($allowedIds, $authId): void {
                $q->whereIn('id', $allowedIds)
                    ->orWhere('created_by', $authId);
            });
        });

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

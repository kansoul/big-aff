<?php

namespace App\Actions\Account;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListUsersWithAccountsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'email', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->with(['accounts:id,account_id,account_name']);

        $ownership->applyTo($query, 'id');

        $query->when(
            ! empty($filters['query']),
            fn ($q) => $q->where(function ($inner) use ($filters): void {
                $search = $filters['query'];
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
        );

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\Channel;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class ListUsersWithChannelsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'email', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->with(['channels:id,code,name,is_active,created_by']);

        $query->when(! $ownership->isAdmin(), function ($q) use ($ownership): void {
            $allowedIds = $ownership->allowedUserIds();
            $authId = (int) Auth::id();
            $q->where(function ($q) use ($allowedIds, $authId): void {
                $q->whereIn('id', $allowedIds)
                    ->orWhere('created_by', $authId);
            });
        });

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

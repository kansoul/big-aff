<?php

namespace App\Actions\Team;

use App\Models\Team;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListTeamsAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'name',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Team::query()->with('users');

        if (! $ownership->isAdmin()) {
            $query->whereHas('users', function ($query) use ($ownership) {
                $ownership->applyTo($query, 'user_id');
            });
        }

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where('name', 'like', "%{$queryString}%");
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

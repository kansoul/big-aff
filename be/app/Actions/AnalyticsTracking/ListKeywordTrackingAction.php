<?php

namespace App\Actions\AnalyticsTracking;

use App\Models\KeywordSet;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Pagination\LengthAwarePaginator;

class ListKeywordTrackingAction
{
    public const array ORDERABLE_COLUMNS = ['id', 'name', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = KeywordSet::query();
        $ownership->applyTo($query);

        $query->when(
            ! empty($filters['keyword']),
            fn ($q) => $q->where('name', 'like', '%'.$filters['keyword'].'%')
        );

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

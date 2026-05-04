<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use App\Support\OwnerResource\KeywordSetResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListKeywordSetsAction
{
    public const array ORDERABLE_COLUMNS = [
        'id',
        'name',
        'created_by',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = KeywordSet::query();

        (new KeywordSetResource)->applyTo($query);

        $query->when(! empty($filters['keyword']), fn ($q) => $q->where('name', 'like', '%'.$filters['keyword'].'%'));

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

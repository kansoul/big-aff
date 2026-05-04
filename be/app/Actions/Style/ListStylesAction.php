<?php

namespace App\Actions\Style;

use App\Models\Style;
use App\Support\OwnerResource\StyleOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListStylesAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'code', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Style::query();

        (new StyleOwnerResource)->applyTo($query);

        $query->when(! empty($filters['query']), function ($q) use ($filters): void {
            $search = $filters['query'];
            $q->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        });

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

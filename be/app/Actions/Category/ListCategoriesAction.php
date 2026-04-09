<?php

namespace App\Actions\Category;

use App\Http\Requests\Category\ListCategoriesRequest;
use App\Models\Category;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCategoriesAction
{
    /**
     * Columns allowed for `order_by` (must match {@see ListCategoriesRequest} rules).
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'name',
        'created_at',
        'updated_at',
    ];

    /**
     * @param  array{query?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Category::query()->with(['featureMedia']);

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('name', 'like', "%{$queryString}%")
                    ->orWhere('description', 'like', "%{$queryString}%");
            });
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

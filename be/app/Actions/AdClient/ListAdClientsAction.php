<?php

namespace App\Actions\AdClient;

use App\Models\AdClient;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdClientsAction
{
    public const ORDERABLE_COLUMNS = [
        'id',
        'ad_client_id',
        'product_code',
        'product_name',
        'created_at',
        'updated_at',
    ];

    /**
     * @param  array{query?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdClient::query();

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('ad_client_id', 'like', "%{$queryString}%")
                    ->orWhere('product_code', 'like', "%{$queryString}%")
                    ->orWhere('product_name', 'like', "%{$queryString}%");
            });
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

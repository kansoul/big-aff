<?php

namespace App\Actions\Adx\Game;

use App\Models\AdxGame;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxGamesAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'slug', 'status', 'sort_order', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxGame::query()
            ->when(! empty($filters['keyword']), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('name', 'like', '%'.$filters['keyword'].'%')
                ->orWhere('slug', 'like', '%'.$filters['keyword'].'%')))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']));

        OwnershipFilter::forAuthUser()->applyTo($query);

        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'sort_order', 'asc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\Adx\Link;

use App\Models\AdxLink;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxLinksAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'status', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxLink::query()
            ->with('game')
            ->when(! empty($filters['keyword']), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('name', 'like', '%'.$filters['keyword'].'%')
                ->orWhere('landing_url', 'like', '%'.$filters['keyword'].'%')))
            ->when(! empty($filters['adx_game_id']), fn ($q) => $q->where('adx_game_id', $filters['adx_game_id']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']));

        OwnershipFilter::forAuthUser()->applyTo($query);
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'id', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

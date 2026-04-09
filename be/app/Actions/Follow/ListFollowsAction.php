<?php

namespace App\Actions\Follow;

use App\Models\Follow;
use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListFollowsAction
{
    public const ORDERABLE_COLUMNS = [
        'id',
        'email',
        'site_id',
        'post_id',
        'created_at',
    ];

    /**
     * @param  array{query?: string|null, site_id?: int|null, post_id?: int|null, per_page?: int|null, page?: int|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Follow::query();
        $ownership->applyThrough($query, 'site_id', fn (array $ids) => Site::whereIn('created_by', $ids)->select('id'));

        if (! empty($filters['query'])) {
            $query->where('email', 'like', '%'.$filters['query'].'%');
        }

        if (! empty($filters['site_id'])) {
            $query->where('site_id', $filters['site_id']);
        }

        if (! empty($filters['post_id'])) {
            $query->where('post_id', $filters['post_id']);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($filters);

        return $pagination->paginateQuery($query);
    }
}

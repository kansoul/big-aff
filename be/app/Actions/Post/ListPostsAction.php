<?php

namespace App\Actions\Post;

use App\Http\Requests\Post\ListPostsRequest;
use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListPostsAction
{
    /**
     * Columns allowed for `order_by` (must match {@see ListPostsRequest} rules).
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'title',
        'slug',
        'status',
        'type',
        'lang',
        'published_at',
        'created_at',
    ];

    /**
     * @param  array{query?: string|null, status?: string|null, type?: string|null, lang?: string|null, category_id?: int|null, deleted_at?: string|null, is_hidden?: int|null, created_by?: int|null, created_at_from?: string|null, created_at_to?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Post::query()->with(['featureMedia', 'category', 'keywordSets', 'creator']);

        if (! empty($filters['deleted_at'])) {
            match ($filters['deleted_at']) {
                'with' => $query->withTrashed(),
                'only' => $query->onlyTrashed(),
                'without' => $query,
            };
        }

        $ownership->applyTo($query);

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('title', 'like', "%{$queryString}%")
                    ->orWhere('slug', 'like', "%{$queryString}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['lang'])) {
            $query->where('lang', $filters['lang']);
        }

        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (isset($filters['is_hidden'])) {
            $query->where('is_hidden', $filters['is_hidden']);
        }

        if (! empty($filters['created_by'])) {
            $query->where('created_by', $filters['created_by']);
        }

        if (! empty($filters['created_at_from'])) {
            $query->whereDate('created_at', '>=', $filters['created_at_from']);
        }

        if (! empty($filters['created_at_to'])) {
            $query->whereDate('created_at', '<=', $filters['created_at_to']);
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

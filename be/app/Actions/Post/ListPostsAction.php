<?php

namespace App\Actions\Post;

use App\Http\Requests\Post\ListPostsRequest;
use App\Models\Post;
use App\Models\User;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

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
     * @param  array{query?: string|null, status?: string|null, type?: string|null, lang?: string|null, category_id?: int|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Post::query()->with(['featureMedia', 'category']);

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

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

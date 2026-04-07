<?php

namespace App\Actions\Post;

use App\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListPostsAction
{
    /**
     * @param  array{query?: string|null, status?: string|null, type?: string|null, lang?: string|null, category_id?: int|null, per_page?: int|null, page?: int|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Post::query()
            ->with(['featureMedia', 'category'])
            ->orderByDesc('created_at');

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

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->paginate($perPage);
    }
}

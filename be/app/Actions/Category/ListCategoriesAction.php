<?php

namespace App\Actions\Category;

use App\Models\Category;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCategoriesAction
{
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Category::query()
            ->with(['featureMedia', 'parent'])
            ->orderByDesc('created_at');

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('name', 'like', "%{$queryString}%")
                    ->orWhere('description', 'like', "%{$queryString}%");
            });
        }

        if (! empty($filters['parent_id'])) {
            $query->where('parent_id', $filters['parent_id']);
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->paginate($perPage);
    }
}

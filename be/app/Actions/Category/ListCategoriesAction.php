<?php

namespace App\Actions\Category;

use App\Models\Category;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCategoriesAction
{
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Category::query()
            ->with(['featureMedia'])
            ->orderByDesc('created_at');

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('name', 'like', "%{$queryString}%")
                    ->orWhere('description', 'like', "%{$queryString}%");
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->paginate($perPage);
    }
}

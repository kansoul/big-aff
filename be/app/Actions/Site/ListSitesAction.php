<?php

namespace App\Actions\Site;

use App\Models\Site;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListSitesAction
{
    /**
     * @param  array{q?: string|null, status?: string|null, per_page?: int|null, page?: int|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Site::query()->with(['logo', 'favicon']);

        if (! empty($filters['keyword'])) {
            $keyword = $filters['keyword'];
            $query->where(function ($builder) use ($keyword): void {
                $builder->where('name', 'like', "%{$keyword}%")
                    ->orWhere('url', 'like', "%{$keyword}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->orderByDesc('id')->paginate($perPage);
    }
}

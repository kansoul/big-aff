<?php

namespace App\Actions\Style;

use App\Models\Style;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListStylesAction
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters, User $user): LengthAwarePaginator
    {
        $query = Style::query()->orderByDesc('created_at');

        if (! $user->is_full_access && $user->style_id !== null) {
            $query->where('id', $user->style_id);
        }

        if (! empty($filters['query'])) {
            $search = $filters['query'];
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->paginate($perPage);
    }
}

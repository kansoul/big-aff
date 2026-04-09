<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListChannelsAction
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters, User $user): LengthAwarePaginator
    {
        $query = Channel::query()->orderByDesc('created_at');

        if (! $user->is_full_access) {
            $query->where('is_active', true);
        }

        if (! empty($filters['query'])) {
            $search = $filters['query'];
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        return $query->paginate($perPage);
    }
}

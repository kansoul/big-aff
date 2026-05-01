<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListChannelsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'code', 'is_active', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters, User $user): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Channel::query();

        $ownership->applyThroughChannel($query, 'code');

        if (! $user->is_full_access) {
            $query->where('is_active', true);
        }

        $query
            ->when(! empty($filters['query']), function ($q) use ($filters): void {
                $search = $filters['query'];
                $q->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when(isset($filters['is_active']), fn($q) => $q->where('is_active', (bool) $filters['is_active']));

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\Site;

use App\Http\Requests\Site\ListSitesRequest;
use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListSitesAction
{
    /**
     * Columns allowed for `order_by` (must match {@see ListSitesRequest} rules).
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'name',
        'url',
        'status',
        'created_at',
        'updated_at',
    ];

    /**
     * @param  array{keyword?: string|null, status?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Site::query()->with(['logo', 'favicon']);

        if (! $ownership->isAdmin()) {
            $query->where(function (Builder $q) use ($ownership) {
                $q->whereIn('created_by', $ownership->allowedUserIds())
                    ->orWhereHas('users', function (Builder $uq) use ($ownership) {
                        $uq->whereIn('users.id', $ownership->allowedUserIds());
                    });
            });
        }

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

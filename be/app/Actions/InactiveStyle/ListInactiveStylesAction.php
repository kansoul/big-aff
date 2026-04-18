<?php

namespace App\Actions\InactiveStyle;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListInactiveStylesAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'style_code',
        'style_name',
        'user_name',
        'user_email',
        'style_updated_at',
        'last_revenue_date',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $twoMonthsAgo = now()->subMonths(2);
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->join('styles', 'styles.id', '=', 'users.style_id')
            ->leftJoin(DB::raw('(
                SELECT style_code, MAX(date) as last_revenue_date
                FROM revenue_reports
                WHERE deleted_at IS NULL
                GROUP BY style_code
            ) as latest_revenue'), 'latest_revenue.style_code', '=', 'styles.code')
            ->select([
                'users.id',
                'users.name as user_name',
                'users.email as user_email',
                'users.style_id',
                'styles.code as style_code',
                'styles.name as style_name',
                'styles.updated_at as style_updated_at',
                DB::raw('latest_revenue.last_revenue_date'),
            ])
            ->whereNull('users.deleted_at')
            ->whereNull('styles.deleted_at')
            ->whereNotNull('users.style_id')
            ->where('styles.updated_at', '<', $twoMonthsAgo)
            ->where(function ($q) use ($twoMonthsAgo): void {
                $q->whereNull(DB::raw('latest_revenue.last_revenue_date'))
                    ->orWhere(DB::raw('latest_revenue.last_revenue_date'), '<', $twoMonthsAgo);
            });

        // Restrict to users the authenticated user can access
        $ownership->applyTo($query, 'users.id');

        if (! empty($filters['manager_id'])) {
            $childUserIds = DB::table('user_parent_child')
                ->where('parent_id', $filters['manager_id'])
                ->pluck('child_id')
                ->toArray();

            if (empty($childUserIds)) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('users.id', $childUserIds);
            }
        }

        if (! empty($filters['query'])) {
            $search = $filters['query'];
            $query->where(function ($q) use ($search): void {
                $q->where('styles.code', 'like', "%{$search}%")
                    ->orWhere('styles.name', 'like', "%{$search}%")
                    ->orWhere('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%");
            });
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'style_updated_at',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

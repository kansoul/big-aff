<?php

namespace App\Actions\InactiveStyle;

use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Facades\DB;

class BulkClearInactiveStylesAction
{
    public function __construct(
        private readonly ListInactiveStylesAction $listInactiveStylesAction,
    ) {}

    /**
     * Clear all inactive style assignments matching the given filters.
     *
     * @param  array<string, mixed>  $filters
     * @return int Number of records cleared
     */
    public function execute(array $filters): int
    {
        $twoMonthsAgo = now()->subMonths(2);

        $query = User::query()
            ->join('styles', 'styles.id', '=', 'users.style_id')
            ->leftJoin(DB::raw('(
                SELECT style_code, MAX(date) as last_revenue_date
                FROM revenue_reports
                WHERE deleted_at IS NULL
                GROUP BY style_code
            ) as latest_revenue'), 'latest_revenue.style_code', '=', 'styles.code')
            ->select('users.id')
            ->whereNull('users.deleted_at')
            ->whereNull('styles.deleted_at')
            ->whereNotNull('users.style_id')
            ->where('styles.updated_at', '<', $twoMonthsAgo)
            ->where(function ($q) use ($twoMonthsAgo): void {
                $q->whereNull(DB::raw('latest_revenue.last_revenue_date'))
                    ->orWhere(DB::raw('latest_revenue.last_revenue_date'), '<', $twoMonthsAgo);
            });

        (new UserOwnerResource)->applyTo($query);

        if (! empty($filters['manager_id'])) {
            $childUserIds = DB::table('user_parent_child')
                ->where('parent_id', $filters['manager_id'])
                ->pluck('child_id')
                ->toArray();

            if (empty($childUserIds)) {
                return 0;
            }

            $query->whereIn('users.id', $childUserIds);
        }

        $userIds = $query->pluck('users.id')->toArray();

        if (empty($userIds)) {
            return 0;
        }

        DB::transaction(function () use ($userIds): void {
            User::whereIn('id', $userIds)->update(['style_id' => null]);
        });

        return count($userIds);
    }
}

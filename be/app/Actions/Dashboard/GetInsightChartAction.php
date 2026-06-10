<?php

namespace App\Actions\Dashboard;

use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class GetInsightChartAction
{
    /**
     * Returns all 6 revenue/spend metrics, each with current and previous period values.
     * Spend is sourced from InsightReport (spend).
     * Revenue is sourced from RevenueReport (estimated_earnings), filtered by channel ownership.
     *
     * @return array{
     *   daily_spend:    array{today: float, yesterday: float},
     *   weekly_spend:   array{this_week: float, last_week: float},
     *   monthly_spend:  array{this_month: float, last_month: float},
     *   daily_revenue:  array{today: float, yesterday: float},
     *   weekly_revenue: array{this_week: float, last_week: float},
     *   monthly_revenue: array{this_month: float, last_month: float},
     * }
     */
    public function execute(?string $month = null): array
    {
        $now = Carbon::now();
        $selectedMonth = $month
            ? Carbon::createFromFormat('Y-m-d', $month.'-01')->startOfMonth()
            : $now->copy()->startOfMonth();

        return [
            'daily_spend' => $this->daily($now, 'spend'),
            'weekly_spend' => $this->weekly($now, 'spend'),
            'monthly_spend' => $this->monthly($selectedMonth, 'spend'),
            'daily_revenue' => $this->daily($now, 'revenue'),
            'weekly_revenue' => $this->weekly($now, 'revenue'),
            'monthly_revenue' => $this->monthly($selectedMonth, 'revenue'),
        ];
    }

    private function spendBaseQuery(): Builder
    {
        $query = InsightReport::query();
        OwnershipFilter::forAuthUser()->applyTo($query, 'owner_user_id');

        return $query;
    }

    private function revenueBaseQuery(): Builder
    {
        $query = RevenueReport::query();
        OwnershipFilter::forAuthUser()->applyTo($query, 'owner_user_id');

        return $query;
    }

    private function daily(Carbon $now, string $type): array
    {
        return [
            'today' => $this->sumPeriod($type, $now->toDateString(), $now->toDateString()),
            'yesterday' => $this->sumPeriod($type, $now->copy()->subDay()->toDateString(), $now->copy()->subDay()->toDateString()),
        ];
    }

    private function weekly(Carbon $now, string $type): array
    {
        return [
            'this_week' => $this->sumPeriod($type, $now->copy()->startOfWeek()->toDateString(), $now->copy()->endOfWeek()->toDateString()),
            'last_week' => $this->sumPeriod($type, $now->copy()->subWeek()->startOfWeek()->toDateString(), $now->copy()->subWeek()->endOfWeek()->toDateString()),
        ];
    }

    private function monthly(Carbon $now, string $type): array
    {
        return [
            'this_month' => $this->sumPeriod($type, $now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString()),
            'last_month' => $this->sumPeriod($type, $now->copy()->subMonth()->startOfMonth()->toDateString(), $now->copy()->subMonth()->endOfMonth()->toDateString()),
        ];
    }

    private function sumPeriod(string $type, string $from, string $to): float
    {
        if ($type === 'spend') {
            return round(
                (float) $this->spendBaseQuery()
                    ->whereDate('date_start', '>=', $from)
                    ->whereDate('date_start', '<=', $to)
                    ->sum('spend'),
                2,
            );
        }

        return round(
            (float) $this->revenueBaseQuery()
                ->whereDate('date', '>=', $from)
                ->whereDate('date', '<=', $to)
                ->sum('estimated_earnings'),
            2,
        );
    }
}

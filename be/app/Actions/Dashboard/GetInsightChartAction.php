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
    public function execute(): array
    {
        $ownership = OwnershipFilter::forAuthUser();
        $now = Carbon::now();

        return [
            'daily_spend' => $this->daily($ownership, $now, 'spend'),
            'weekly_spend' => $this->weekly($ownership, $now, 'spend'),
            'monthly_spend' => $this->monthly($ownership, $now, 'spend'),
            'daily_revenue' => $this->daily($ownership, $now, 'revenue'),
            'weekly_revenue' => $this->weekly($ownership, $now, 'revenue'),
            'monthly_revenue' => $this->monthly($ownership, $now, 'revenue'),
        ];
    }

    private function spendBaseQuery(OwnershipFilter $ownership): Builder
    {
        $query = InsightReport::query();
        $ownership->applyThroughAccount($query);

        return $query;
    }

    private function revenueBaseQuery(OwnershipFilter $ownership): Builder
    {
        $query = RevenueReport::query();
        $ownership->applyThroughChannel($query);

        return $query;
    }

    private function daily(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        return [
            'today' => $this->sumPeriod($ownership, $type, $now->toDateString(), $now->toDateString()),
            'yesterday' => $this->sumPeriod($ownership, $type, $now->copy()->subDay()->toDateString(), $now->copy()->subDay()->toDateString()),
        ];
    }

    private function weekly(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        return [
            'this_week' => $this->sumPeriod($ownership, $type, $now->copy()->startOfWeek()->toDateString(), $now->copy()->endOfWeek()->toDateString()),
            'last_week' => $this->sumPeriod($ownership, $type, $now->copy()->subWeek()->startOfWeek()->toDateString(), $now->copy()->subWeek()->endOfWeek()->toDateString()),
        ];
    }

    private function monthly(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        return [
            'this_month' => $this->sumPeriod($ownership, $type, $now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString()),
            'last_month' => $this->sumPeriod($ownership, $type, $now->copy()->subMonth()->startOfMonth()->toDateString(), $now->copy()->subMonth()->endOfMonth()->toDateString()),
        ];
    }

    private function sumPeriod(OwnershipFilter $ownership, string $type, string $from, string $to): float
    {
        if ($type === 'spend') {
            $query = $this->spendBaseQuery($ownership);

            return round(
                (float) $query->whereDate('date_start', '>=', $from)
                    ->whereDate('date_start', '<=', $to)
                    ->sum('spend'),
                2,
            );
        }

        $query = $this->revenueBaseQuery($ownership);

        return round(
            (float) $query->whereDate('date', '>=', $from)
                ->whereDate('date', '<=', $to)
                ->sum('estimated_earnings'),
            2,
        );
    }
}

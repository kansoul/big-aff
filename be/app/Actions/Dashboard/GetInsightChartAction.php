<?php

namespace App\Actions\Dashboard;

use App\Models\Account;
use App\Models\CampaignReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class GetInsightChartAction
{
    /**
     * Returns all 6 revenue/spend metrics, each with current and previous period values.
     * Spend is sourced from CampaignReport (a_spend).
     * Revenue is sourced from RevenueReport (estimated_earnings), joined via channel_code + date.
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

    private function baseQuery(OwnershipFilter $ownership): Builder
    {
        $query = CampaignReport::query()
            ->leftJoin('revenue_reports as rr', function ($join) {
                $join->on('rr.channel_code', '=', 'campaign_reports.channel_code')
                    ->whereColumn('rr.date', 'campaign_reports.date_start');
            });

        $ownership->applyThrough(
            $query,
            'account_id',
            fn(array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        return $query;
    }

    private function daily(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        $base = $this->baseQuery($ownership);

        return [
            'today' => $this->sumColumn(clone $base, $type, $now->toDateString(), $now->toDateString()),
            'yesterday' => $this->sumColumn(clone $base, $type, $now->copy()->subDay()->toDateString(), $now->copy()->subDay()->toDateString()),
        ];
    }

    private function weekly(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        $base = $this->baseQuery($ownership);

        return [
            'this_week' => $this->sumColumn(clone $base, $type, $now->copy()->startOfWeek()->toDateString(), $now->copy()->endOfWeek()->toDateString()),
            'last_week' => $this->sumColumn(clone $base, $type, $now->copy()->subWeek()->startOfWeek()->toDateString(), $now->copy()->subWeek()->endOfWeek()->toDateString()),
        ];
    }

    private function monthly(OwnershipFilter $ownership, Carbon $now, string $type): array
    {
        $base = $this->baseQuery($ownership);

        return [
            'this_month' => $this->sumColumn(clone $base, $type, $now->copy()->startOfMonth()->toDateString(), $now->copy()->endOfMonth()->toDateString()),
            'last_month' => $this->sumColumn(clone $base, $type, $now->copy()->subMonth()->startOfMonth()->toDateString(), $now->copy()->subMonth()->endOfMonth()->toDateString()),
        ];
    }

    private function sumColumn(Builder $query, string $type, string $from, string $to): float
    {
        $column = $type === 'spend' ? 'campaign_reports.a_spend' : 'rr.estimated_earnings';

        return round(
            (float) $query->whereDate('campaign_reports.date_start', '>=', $from)
                ->whereDate('campaign_reports.date_start', '<=', $to)
                ->sum($column),
            2,
        );
    }
}

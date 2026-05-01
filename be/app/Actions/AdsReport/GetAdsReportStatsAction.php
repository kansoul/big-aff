<?php

namespace App\Actions\AdsReport;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Models\Style;
use App\Models\TeamUser;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class GetAdsReportStatsAction
{
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $teamId = isset($filters['team_id']) ? (int) $filters['team_id'] : null;
        $adsType = $filters['ads_type'] ?? null;
        $accountId = $filters['account_id'] ?? null;
        $campaignIds = ! empty($filters['campaign_ids']) ? $filters['campaign_ids'] : null;

        $accountIds = $this->resolveAccountIds($teamId, $adsType, $accountId);

        // Campaign stats
        $campaignQuery = Campaign::query();
        $ownership->applyThroughAccount($campaignQuery, 'account_id');

        if ($accountIds !== null) {
            $campaignQuery->whereIn('account_id', $accountIds);
        }
        if ($campaignIds !== null) {
            $campaignQuery->whereIn('campaign_id', $campaignIds);
        }

        $totalCampaigns = (clone $campaignQuery)->count();
        $activeCampaigns = (clone $campaignQuery)->where('status', 'ACTIVE')->count();
        $pausedCampaigns = (clone $campaignQuery)->where('status', 'PAUSED')->count();
        $archivedCampaigns = (clone $campaignQuery)->where('status', 'ARCHIVED')->count();

        // Insight stats (spend, reach)
        $insightQuery = InsightReport::query();
        $ownership->applyThroughAccount($insightQuery);

        if ($dateFrom) {
            $insightQuery->whereDate('date_start', '>=', $dateFrom);
        }
        if ($dateTo) {
            $insightQuery->whereDate('date_start', '<=', $dateTo);
        }
        if ($accountIds !== null) {
            $insightQuery->whereIn('account_id', $accountIds);
        }
        if ($campaignIds !== null) {
            $insightQuery->whereIn('campaign_id', $campaignIds);
        }

        $spendByCurrency = (clone $insightQuery)
            ->selectRaw('spend_type, SUM(spend) as total_spend')
            ->groupBy('spend_type')
            ->get()
            ->map(fn ($row) => [
                'currency' => $row->spend_type,
                'amount' => number_format((float) ($row->total_spend ?? 0), 2),
            ])
            ->values()
            ->toArray();

        if (empty($spendByCurrency)) {
            $spendByCurrency = [['currency' => 'USD', 'amount' => '0.00']];
        }

        $totalSpend = (float) (clone $insightQuery)->sum('spend');
        $totalReach = (int) (clone $insightQuery)->sum('reach');

        // Revenue + Profit hidden when account or campaign filter is active
        $showRevenueProfit = $accountId === null && $campaignIds === null;
        $totalRevenue = null;
        $profit = null;

        if ($showRevenueProfit) {
            $revenueQuery = RevenueReport::query();
            $ownership->applyThrough($revenueQuery, 'style_code', fn (array $ids) => Style::whereIn('created_by', $ids)->select('code'));

            if ($dateFrom) {
                $revenueQuery->whereDate('date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $revenueQuery->whereDate('date', '<=', $dateTo);
            }

            $totalRevenue = (float) $revenueQuery->sum('estimated_earnings');
            $profit = $totalRevenue - $totalSpend;
        }

        return [
            'campaigns' => [
                'total' => $totalCampaigns,
                'active' => $activeCampaigns,
                'paused' => $pausedCampaigns,
                'archived' => $archivedCampaigns,
            ],
            'spend_by_currency' => $spendByCurrency,
            'total_reach' => $totalReach,
            'show_revenue_profit' => $showRevenueProfit,
            'revenue' => $totalRevenue !== null ? number_format($totalRevenue, 2) : null,
            'profit' => $profit !== null ? number_format($profit, 2) : null,
        ];
    }

    /**
     * @return list<string>|null null = no account-level filter (admin, no extra constraints)
     */
    private function resolveAccountIds(?int $teamId, ?string $adsType, ?string $accountId): ?array
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->is_admin && $teamId === null && $adsType === null && $accountId === null) {
            return null;
        }

        $query = $this->accessibleAccountQuery($user);

        if ($accountId !== null) {
            $query->where('account_id', $accountId);
        }
        if ($teamId !== null) {
            $query->where('team_id', $teamId);
        }
        if ($adsType !== null) {
            $query->where('ads_type', $adsType);
        }

        return $query->pluck('account_id')->toArray();
    }

    /**
     * @return Builder<Account>
     */
    private function accessibleAccountQuery(User $user): Builder
    {
        $query = Account::query();

        if ($user->is_admin) {
            return $query;
        }

        $managerTeamIds = TeamUser::query()
            ->where('user_id', $user->id)
            ->where('team_role', TeamRole::MANAGER->value)
            ->pluck('team_id')
            ->all();

        if (count($managerTeamIds) > 1) {
            return $query->whereIn('team_id', $managerTeamIds);
        }

        return $query->whereHas('users', fn ($builder) => $builder->where('users.id', $user->id));
    }
}

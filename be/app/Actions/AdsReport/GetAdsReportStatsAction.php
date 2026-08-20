<?php

namespace App\Actions\AdsReport;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Models\User;
use App\Support\AdsReport\AdsReportAccess;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\OwnerResource\AccountOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GetAdsReportStatsAction
{
    public function execute(array $filters): array
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $teamIds = ! empty($filters['team_ids'])
            ? array_map('intval', (array) $filters['team_ids'])
            : null;
        $mainTeamIds = config('main_system.is_main') && ! empty($filters['main_team_ids'])
            ? array_map('intval', (array) $filters['main_team_ids'])
            : null;
        $adsTypes = ! empty($filters['ads_types']) ? (array) $filters['ads_types'] : null;
        $accountIdsFilter = ! empty($filters['account_ids']) ? (array) $filters['account_ids'] : null;
        $campaignIds = ! empty($filters['campaign_ids']) ? $filters['campaign_ids'] : null;
        /** @var User $user */
        $user = Auth::user();
        $canViewUnscoped = AdsReportAccess::canViewUnscoped($user);
        $ownership = OwnershipFilter::forAuthUser();

        $accountIds = $this->resolveAccountIds(
            $canViewUnscoped,
            $teamIds,
            $mainTeamIds,
            $adsTypes,
            $accountIdsFilter,
        );

        // Campaign stats
        $campaignQuery = Campaign::query();
        if (! $canViewUnscoped) {
            (new AccountLinkedOwnerResource)->applyTo($campaignQuery);
        }

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

        // Insight stats (spend, reach) — scoped by owner_user_id
        $insightQuery = InsightReport::query();
        if (! $canViewUnscoped) {
            $ownership->applyTo($insightQuery, 'owner_user_id');
        }

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
        $showRevenueProfit = $accountIdsFilter === null && $campaignIds === null;
        $totalRevenue = null;
        $profit = null;

        if ($showRevenueProfit) {
            $revenueQuery = RevenueReport::query()
                ->join('campaigns as revenue_campaigns', 'revenue_campaigns.campaign_id', '=', 'revenue_reports.campaign_id');
            if (! $canViewUnscoped) {
                $revenueQuery->whereIn('revenue_campaigns.created_by', $ownership->allowedUserIds());
            }
            if ($mainTeamIds !== null) {
                $revenueQuery
                    ->join('accounts as revenue_accounts', 'revenue_accounts.account_id', '=', 'revenue_campaigns.account_id')
                    ->whereIn('revenue_accounts.main_team_id', $mainTeamIds);
            }
            if ($dateFrom) {
                $revenueQuery->whereDate('revenue_reports.created_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $revenueQuery->whereDate('revenue_reports.created_at', '<=', $dateTo);
            }

            $totalRevenue = (float) $revenueQuery->sum('revenue_reports.revenue');
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
    private function resolveAccountIds(
        bool $canViewUnscoped,
        ?array $teamIds,
        ?array $mainTeamIds,
        ?array $adsTypes,
        ?array $accountIds,
    ): ?array {
        if (
            $canViewUnscoped
            && $teamIds === null
            && $mainTeamIds === null
            && $adsTypes === null
            && $accountIds === null
        ) {
            return null;
        }

        $query = $this->accessibleAccountQuery($canViewUnscoped);

        if ($accountIds !== null) {
            $query->whereIn('account_id', $accountIds);
        }
        if ($teamIds !== null) {
            $this->applyTeamFilter($query, $teamIds);
        }
        if ($canViewUnscoped && $mainTeamIds !== null) {
            $query->whereIn('main_team_id', $mainTeamIds);
        }
        if ($adsTypes !== null) {
            $query->whereIn('ads_type', $adsTypes);
        }

        return $query->pluck('account_id')->toArray();
    }

    /**
     * @return Builder<Account>
     */
    private function accessibleAccountQuery(bool $canViewUnscoped): Builder
    {
        $query = Account::query();

        if ($canViewUnscoped) {
            return $query;
        }

        (new AccountOwnerResource)->applyTo($query);

        return $query;
    }

    /**
     * Team membership is represented by users in a team and accounts assigned to those users.
     * Some legacy/imported accounts also keep accounts.team_id, so keep both paths.
     *
     * @param  list<int>  $teamIds
     */
    private function applyTeamFilter(Builder $query, array $teamIds): void
    {
        $accountIdsAssignedToTeamUsers = DB::table('account_user')
            ->join('team_user', 'team_user.user_id', '=', 'account_user.user_id')
            ->whereIn('team_user.team_id', $teamIds)
            ->select('account_user.account_id');

        $query->where(function (Builder $builder) use ($teamIds, $accountIdsAssignedToTeamUsers): void {
            $builder
                ->whereIn('team_id', $teamIds)
                ->orWhereIn('id', $accountIdsAssignedToTeamUsers);
        });
    }
}

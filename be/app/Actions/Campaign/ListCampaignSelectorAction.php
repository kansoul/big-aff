<?php

namespace App\Actions\Campaign;

use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCampaignSelectorAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'campaign_id',
        'campaign_name',
        'total_spend',
        'total_revenue',
        'profit',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $resource = new AccountLinkedOwnerResource;

        $query = CampaignReport::query()
            ->selectRaw('
                campaign_id,
                campaign_name,
                account_id,
                account_name,
                a_spend as total_spend,
                r_revenue as total_revenue,
                r_revenue - a_spend as profit
            ')
            ->whereDate('date_start', today());

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $query,
                'campaign_reports.account_id',
                adsTypeColumn: 'campaign_reports.ads_type',
            );
            MainTeamReportDataScope::excludeNonFetchableChannels($query, 'campaign_reports.channel_code');
        }

        if (! $resource->isAdmin()) {
            $query->whereIn(
                'campaign_id',
                Campaign::whereIn('created_by', $resource->allowedUserIds())->select('campaign_id'),
            );
        }

        if (! empty($filters['account_id'])) {
            $query->where('account_id', $filters['account_id']);
        }

        if (! empty($filters['user_id'])) {
            $query->whereIn('campaign_id', Campaign::where('created_by', $filters['user_id'])->select('campaign_id'));
        }

        if (! empty($filters['style_code'])) {
            $query->where('style_code', $filters['style_code']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('campaign_name', 'like', "%{$search}%")
                    ->orWhere('campaign_id', 'like', "%{$search}%");
            });
        }

        if (isset($filters['min_spend'])) {
            $query->where('a_spend', '>=', (float) $filters['min_spend']);
        }

        if (isset($filters['min_revenue'])) {
            $query->where('r_revenue', '>=', (float) $filters['min_revenue']);
        }

        if (isset($filters['min_profit'])) {
            $query->whereRaw('r_revenue - a_spend >= ?', [(float) $filters['min_profit']]);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'total_spend',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

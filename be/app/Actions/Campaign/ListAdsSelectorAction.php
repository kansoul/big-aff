<?php

namespace App\Actions\Campaign;

use App\Models\AdsInsightsReport;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdsSelectorAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'ad_id',
        'ad_name',
        'spend',
        'cpa',
        'date_start',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdsInsightsReport::query()
            ->select([
                'id',
                'ad_id',
                'ad_name',
                'adset_id',
                'campaign_id',
                'account_id',
                'date_start',
                'spend',
                'cpa',
            ]);

        (new AccountLinkedOwnerResource)->applyTo($query);

        if (! empty($filters['campaign_id'])) {
            $query->where('campaign_id', $filters['campaign_id']);
        }

        if (! empty($filters['adset_id'])) {
            $query->where('adset_id', $filters['adset_id']);
        }

        if (! empty($filters['account_id'])) {
            $query->where('account_id', $filters['account_id']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('ad_name', 'like', "%{$search}%")
                    ->orWhere('ad_id', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['date_start_from'])) {
            $query->whereDate('date_start', '>=', $filters['date_start_from']);
        }

        if (! empty($filters['date_start_to'])) {
            $query->whereDate('date_start', '<=', $filters['date_start_to']);
        }

        if (isset($filters['min_spend'])) {
            $query->where('spend', '>=', (float) $filters['min_spend']);
        }

        if (isset($filters['max_cpa'])) {
            $query->where('cpa', '<=', (float) $filters['max_cpa']);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'spend',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

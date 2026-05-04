<?php

namespace App\Actions\Campaign;

use App\Models\AdsetInsightsReport;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdsetSelectorAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'adset_id',
        'adset_name',
        'spend',
        'cpa',
        'date_start',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdsetInsightsReport::query()
            ->select([
                'id',
                'adset_id',
                'adset_name',
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

        if (! empty($filters['account_id'])) {
            $query->where('account_id', $filters['account_id']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('adset_name', 'like', "%{$search}%")
                    ->orWhere('adset_id', 'like', "%{$search}%");
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

<?php

namespace App\Actions\RevenueReport;

use App\Models\RevenueReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListRevenueReportsAction
{
    /** @var array<int, string> */
    public const ORDERABLE_COLUMNS = [
        'id',
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'revenue',
        'created_at',
        'revenue_received_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     * @return array{paginator: LengthAwarePaginator, summary: array<string, mixed>}
     */
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();
        $query = RevenueReport::query();

        if (! $ownership->isAdmin()) {
            $query->whereHas('campaign', fn ($campaign) => $campaign->whereIn('created_by', $ownership->allowedUserIds()));
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['campaign_ids'])) {
            $query->whereIn('campaign_id', $filters['campaign_ids']);
        }

        $summary = ['revenue' => (float) (clone $query)->sum('revenue')];

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return [
            'paginator' => PaginationInput::fromValidatedArray($filters)->paginateQuery($query),
            'summary' => $summary,
        ];
    }
}

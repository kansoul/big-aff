<?php

namespace App\Support\AdsDelivery;

use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use Illuminate\Database\Eloquent\Builder;

final class DeliveryInsightsReportFilters
{
    /**
     * @param  Builder<AdsetInsightsReport|AdsInsightsReport>  $query
     * @param  array<string, mixed>  $filters
     */
    public static function apply(Builder $query, array $filters, string $type): void
    {
        if (! empty($filters['date_from'])) {
            $query->whereDate('date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['created_time_from'])) {
            $query->whereDate('created_time', '>=', $filters['created_time_from']);
        }

        if (! empty($filters['created_time_to'])) {
            $query->whereDate('created_time', '<=', $filters['created_time_to']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if ($type === 'adsets') {
            if (! empty($filters['adset_id'])) {
                $query->where('adset_id', 'like', '%'.$filters['adset_id'].'%');
            }
            if (! empty($filters['adset_name'])) {
                $query->where('adset_name', 'like', '%'.$filters['adset_name'].'%');
            }
        } else {
            if (! empty($filters['ad_id'])) {
                $query->where('ad_id', 'like', '%'.$filters['ad_id'].'%');
            }
            if (! empty($filters['ad_name'])) {
                $query->where('ad_name', 'like', '%'.$filters['ad_name'].'%');
            }
            if (! empty($filters['adset_id'])) {
                $query->where('adset_id', 'like', '%'.$filters['adset_id'].'%');
            }
        }
    }
}

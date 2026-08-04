<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Models\CampaignReport;
use App\Models\ClickTracking;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GetClickTrackingEntitiesAction
{
    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, ClickTracking>
     */
    public function execute(string $campaignId, array $filters): Collection
    {
        $query = ClickTracking::query()
            ->where('campaign_id', $campaignId)
            ->latest('event_time')
            ->latest('id');

        OwnershipFilter::forAuthUser()->applyThrough(
            $query,
            'campaign_id',
            fn (array $userIds) => CampaignReport::query()
                ->whereIn('owner_user_id', $userIds)
                ->select('campaign_id'),
        );

        $query
            ->when($filters['adset_id'] ?? null, fn ($builder, $value) => $builder->where('adset_id', $value))
            ->when($filters['ad_id'] ?? null, fn ($builder, $value) => $builder->where('ad_id', $value))
            ->when($filters['session_id'] ?? null, fn ($builder, $value) => $builder->where('session_id', $value))
            ->when($filters['click_id'] ?? null, fn ($builder, $value) => $builder->whereKey($value))
            ->when($filters['event_type'] ?? null, fn ($builder, $value) => $builder->where('event_type', $value))
            ->when(
                $filters['date_from'] ?? null,
                fn ($builder, $value) => $builder->whereDate(DB::raw('COALESCE(event_time, created_at)'), '>=', $value),
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($builder, $value) => $builder->whereDate(DB::raw('COALESCE(event_time, created_at)'), '<=', $value),
            );

        return $query->get();
    }
}

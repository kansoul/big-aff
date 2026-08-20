<?php

namespace App\Actions\AnalyticsTracking;

use App\Models\Campaign;
use App\Models\Link;
use App\Support\OwnershipFilter\OwnershipFilter;

class GetAnalyticsTrackingFilterOptionsAction
{
    /**
     * @return array{links: array<array{id: int, name: string}>, campaigns: array<string>}
     */
    public function execute(): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $campaignQuery = Campaign::query()
            ->whereNotNull('link_id');

        if (! $ownership->isAdmin()) {
            $ownership->applyThroughAccount($campaignQuery);
        }

        $campaignRows = $campaignQuery
            ->select(['link_id', 'campaign_id'])
            ->get();

        $linkIds = $campaignRows->pluck('link_id')->filter()->unique()->values();
        $campaigns = $campaignRows->pluck('campaign_id')->filter()->unique()->sort()->values();

        $links = Link::query()->select(['id', 'name'])->whereIn('id', $linkIds)->orderBy('name')->get();

        return [
            'links' => $links->all(),
            'campaigns' => $campaigns->all(),
        ];
    }
}

<?php

namespace App\Actions\AnalyticsTracking;

use App\Models\AdsLink;
use App\Models\LinkData;
use App\Support\OwnershipFilter\OwnershipFilter;

class GetAnalyticsTrackingFilterOptionsAction
{
    /**
     * @return array{ads_links: array<array{id: int, slug: string}>, campaigns: array<string>}
     */
    public function execute(): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $linkDataQuery = LinkData::query()
            ->whereNotNull('ads_link_id');

        if (! $ownership->isAdmin()) {
            $ownership->applyTo($linkDataQuery);
        }

        $linkDatas = $linkDataQuery
            ->select(['ads_link_id', 'campaign_id'])
            ->get();

        $adsLinkIds = $linkDatas->pluck('ads_link_id')->filter()->unique()->values();
        $campaigns = $linkDatas->pluck('campaign_id')->filter()->unique()->sort()->values();

        $adsLinks = AdsLink::query()
            ->select(['id', 'slug', 'site_id'])
            ->with([
                'site:id,url',
            ])
            ->whereIn('id', $adsLinkIds)
            ->orderBy('slug')
            ->get()
            ->map(fn ($link) => [
                'id' => $link->id,
                'slug' => $link->site?->url.'/articles/'.$link->slug,
            ])
            ->values();

        return [
            'ads_links' => $adsLinks->all(),
            'campaigns' => $campaigns->all(),
        ];
    }
}

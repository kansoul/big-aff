<?php

namespace App\Models\Traits\Attribute;

use Illuminate\Database\Eloquent\Casts\Attribute;

trait CampaignReportAttribute
{
    /**
     * Tracking article link for the report row.
     *
     * IMPORTANT: Always eager-load:
     * - realtimeReport.linkData.adsLink.site
     *
     * If those relations are not loaded, this accessor returns null to avoid
     * unexpected lazy-loading / N+1 queries.
     */
    protected function link(): Attribute
    {
        return Attribute::make(
            get: function (): ?string {
                if (! $this->relationLoaded('realtimeReport')) {
                    return null;
                }

                $rt = $this->realtimeReport;
                if (! $rt) {
                    return null;
                }

                if (! $rt->relationLoaded('linkData')) {
                    return null;
                }

                $linkData = $rt->linkData;
                if (! $linkData) {
                    return null;
                }

                if (! $linkData->relationLoaded('adsLink')) {
                    return null;
                }

                $adsLink = $linkData->adsLink;
                if (! $adsLink) {
                    return null;
                }

                if (! $adsLink->relationLoaded('site')) {
                    return null;
                }

                $siteUrl = $adsLink->site?->url;
                $slug = $adsLink->slug;
                if (empty($siteUrl) || empty($slug)) {
                    return null;
                }

                $base = rtrim($siteUrl, '/');
                $url = "{$base}/articles/{$slug}";

                $campaignId = (string) ($this->campaign_id ?? '');
                $adsType = strtolower((string) ($this->ads_type ?? ''));
                $tt = $adsType === 'facebook' ? 'fb' : ($adsType === 'google' ? 'gg' : null);

                if ($campaignId !== '' && $tt !== null) {
                    $url .= '?'.http_build_query([
                        'campaign_id' => $campaignId,
                        'tt' => $tt,
                    ]);
                }

                return $url;
            },
        );
    }
}

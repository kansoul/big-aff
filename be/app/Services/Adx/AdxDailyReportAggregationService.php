<?php

namespace App\Services\Adx;

use App\Models\AdxCampaignReport;
use App\Models\AdxLinkData;
use App\Models\AdxRealtimeReport;
use App\Models\AdxRevenueReport;
use App\Models\AdxSpendReport;
use Carbon\CarbonPeriod;

/**
 * Aggregates link-level (adx_link_data) rows into adx_campaign_reports.
 * Each row is keyed on (date, source, account_id, campaign_id, adx_link_data_id).
 * Funnel metrics come from adx_realtime_reports via adx_realtime_report_id FK.
 */
class AdxDailyReportAggregationService
{
    public function sync(string $startDate, string $endDate): int
    {
        $rows = [];
        foreach (CarbonPeriod::create($startDate, $endDate) as $date) {
            $this->collectSpendRows($rows, $date->toDateString());
            $this->collectRevenueRows($rows, $date->toDateString());
            $this->collectRealtimeRows($rows, $date->toDateString());
        }

        foreach ($rows as $row) {
            $this->persistRow($row);
        }

        return count($rows);
    }

    /**
     * @param  array<string, array<string, mixed>>  $rows
     */
    private function collectSpendRows(array &$rows, string $date): void
    {
        AdxSpendReport::query()
            ->whereDate('date', $date)
            ->get()
            ->each(function (AdxSpendReport $report) use (&$rows, $date): void {
                $linkData = $this->resolveLinkData($report->source, $report->account_id, $report->campaign_id);
                $row = &$this->row($rows, $date, $report->source, $report->account_id, $report->campaign_id, $linkData);

                $row['spend'] += (float) $report->cost;
                $row['ads_clicks'] += (int) $report->clicks;
                $row['ads_impressions'] += (int) $report->impressions;
                $row['currency'] = $report->currency ?: $row['currency'];
            });
    }

    /**
     * @param  array<string, array<string, mixed>>  $rows
     */
    private function collectRevenueRows(array &$rows, string $date): void
    {
        AdxRevenueReport::query()
            ->with('linkData')
            ->whereDate('date', $date)
            ->get()
            ->each(function (AdxRevenueReport $report) use (&$rows, $date): void {
                $linkData = $report->linkData ?: $this->resolveLinkData(null, null, $report->campaign_id);
                $source = $linkData?->source ?? 'other';
                $accountId = $linkData?->account_id;
                $campaignId = $report->campaign_id ?? $linkData?->campaign_id;
                $row = &$this->row($rows, $date, $source, $accountId, $campaignId, $linkData);

                $row['adx_link_id'] = $report->adx_link_id ?? $row['adx_link_id'];
                $row['adx_game_id'] = $report->adx_game_id ?? $row['adx_game_id'];
                $row['revenue'] += (float) $report->total_revenue;
                $row['adx_impressions'] += (int) $report->impressions;
                $row['adx_clicks'] += (int) $report->clicks;
                $row['adx_requests'] += (int) $report->requests;
                $row['adx_matched_requests'] += (int) $report->matched_requests;
                $row['adx_viewable_impressions'] += (int) $report->viewable_impressions;
                $row['currency'] = $report->currency ?: $row['currency'];
            });
    }

    /**
     * @param  array<string, array<string, mixed>>  $rows
     */
    private function collectRealtimeRows(array &$rows, string $date): void
    {
        AdxRealtimeReport::query()
            ->with('linkData')
            ->whereDate('report_date', $date)
            ->get()
            ->each(function (AdxRealtimeReport $report) use (&$rows, $date): void {
                $linkData = $report->linkData;
                $row = &$this->row($rows, $date, $linkData?->source ?? 'other', $linkData?->account_id, $linkData?->campaign_id, $linkData);
                // Store FK instead of duplicating the funnel metric columns
                $row['adx_realtime_report_id'] = $report->id;
            });
    }

    private function resolveLinkData(?string $source, ?string $accountId, ?string $campaignId): ?AdxLinkData
    {
        if ($campaignId === null || $campaignId === '') {
            return null;
        }

        return AdxLinkData::query()
            ->when($source, fn ($query) => $query->where('source', $source))
            ->when($accountId, fn ($query) => $query->where('account_id', $accountId))
            ->where('campaign_id', $campaignId)
            ->orderByDesc('last_seen_at')
            ->first();
    }

    /**
     * @param  array<string, array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function &row(array &$rows, string $date, string $source, ?string $accountId, ?string $campaignId, ?AdxLinkData $linkData): array
    {
        $key = implode('|', [
            $date,
            $source,
            $accountId ?? '',
            $campaignId ?? '',
        ]);

        if (! isset($rows[$key])) {
            $rows[$key] = [
                'date' => $date,
                'source' => $source,
                'account_id' => $accountId,
                'campaign_id' => $campaignId,
                'adx_link_data_id' => $linkData?->id,
                'adx_link_id' => $linkData?->adx_link_id,
                'adx_game_id' => $linkData?->adx_game_id,
                'adx_realtime_report_id' => null,
                'spend' => 0.0,
                'revenue' => 0.0,
                'ads_clicks' => 0,
                'ads_impressions' => 0,
                'adx_impressions' => 0,
                'adx_clicks' => 0,
                'adx_requests' => 0,
                'adx_matched_requests' => 0,
                'adx_viewable_impressions' => 0,
                'currency' => 'USD',
            ];
        }

        if ($linkData !== null) {
            $rows[$key]['adx_link_data_id'] ??= $linkData->id;
            $rows[$key]['adx_link_id'] ??= $linkData->adx_link_id;
            $rows[$key]['adx_game_id'] ??= $linkData->adx_game_id;
        }

        return $rows[$key];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function persistRow(array $row): void
    {
        $spend = (float) $row['spend'];
        $revenue = (float) $row['revenue'];
        $profit = $revenue - $spend;
        $adsClicks = (int) $row['ads_clicks'];
        $adxImpressions = (int) $row['adx_impressions'];

        AdxCampaignReport::query()->updateOrCreate(
            [
                'date' => $row['date'],
                'source' => $row['source'],
                'account_id' => $row['account_id'],
                'campaign_id' => $row['campaign_id'],
            ],
            [
                ...$row,
                'profit' => $profit,
                'roi' => $spend > 0 ? ($profit / $spend) * 100 : 0,
                'roas' => $spend > 0 ? $revenue / $spend : 0,
                'cpc' => $adsClicks > 0 ? $spend / $adsClicks : 0,
                'epc' => $adsClicks > 0 ? $revenue / $adsClicks : 0,
                'rpm' => $adxImpressions > 0 ? ($revenue / $adxImpressions) * 1000 : 0,
            ],
        );
    }
}

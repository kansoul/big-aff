<?php

namespace App\Services\Campaign;

use App\Jobs\SendTelegramAlertJob;
use App\Models\Campaign;
use App\Models\CampaignReport;
use Illuminate\Database\Eloquent\Collection;

class DetectTrashCampaignService
{
    private const MIN_SPEND = 5;

    /**
     * Detect campaigns that have CampaignReport with spend but no linked RealtimeReport.
     */
    public function detect(?string $date = null): void
    {
        $trashCampaignIds = CampaignReport::query()
            ->join('campaigns', 'campaign_reports.campaign_id', '=', 'campaigns.campaign_id')
            ->where('campaign_reports.a_spend', '>', self::MIN_SPEND)
            ->where(function ($q) {
                $q->whereNull('campaign_reports.realtime_report_id')
                    ->orWhereNotExists(function ($sub) {
                        $sub->selectRaw('1')
                            ->from('realtime_reports')
                            ->whereColumn('realtime_reports.id', 'campaign_reports.realtime_report_id');
                    });
            })
            ->where('campaigns.status', 'ACTIVE')
            ->whereNull('campaigns.deleted_at')
            ->when($date, fn ($q) => $q->whereDate('campaign_reports.date_start', $date))
            ->pluck('campaign_reports.campaign_id')
            ->unique();

        if ($trashCampaignIds->isEmpty()) {
            return;
        }

        $trashCampaigns = Campaign::query()
            ->whereIn('campaign_id', $trashCampaignIds)
            ->with(['account'])
            ->get();

        if ($trashCampaigns->isEmpty()) {
            return;
        }
        info($trashCampaigns);

        $message = $this->buildAlertMessage($trashCampaigns, $date);

        SendTelegramAlertJob::dispatch($message);
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     */
    private function buildAlertMessage(Collection $campaigns, ?string $date): string
    {
        $totalCount = $campaigns->count();

        $message = "⚠️ *Cảnh báo: Campaign không có Report*\n\n";
        $message .= '🕐 *Thời gian:* '.now()->format('Y-m-d H:i:s')."\n";
        $message .= '📅 *Ngày kiểm tra:* '.($date ?? 'Tất cả')."\n";
        $message .= "🔢 *Số lượng:* *{$totalCount}* campaign\n\n";

        foreach ($campaigns as $campaign) {
            $accountName = $campaign->account?->account_name ?? 'N/A';
            $fullAccountName = $accountName.' ('.$campaign->account_id.')';
            $safeAccountName = str_replace('_', '\_', $fullAccountName);

            $dateRange = $date ? "{$date}_{$date}%2Ctoday" : 'today%2Ctoday';
            $link = "https://adsmanager.facebook.com/adsmanager/manage/adsets?act={$campaign->account_id}&date={$dateRange}&insights_date={$dateRange}&selected_campaign_ids={$campaign->campaign_id}&nav_source=no_referrer";

            $message .= "*🏦 Account:* {$safeAccountName}\n";
            $message .= "*🏷 Campaign:* [{$campaign->campaign_name}]({$link})\n";
            $message .= "*🆔 Campaign ID:* {$campaign->campaign_id}\n";
            $message .= "➖➖➖➖➖➖➖➖➖➖\n\n";
        }

        return $message;
    }
}

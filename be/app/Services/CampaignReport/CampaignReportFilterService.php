<?php

namespace App\Services\CampaignReport;

use App\Models\Account;
use App\Models\CampaignReport;
use App\Models\RevenueChartReport;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class CampaignReportFilterService
{
    private const ADS_TYPES = [
        ['value' => 'google', 'label' => 'Google'],
        ['value' => 'tiktok', 'label' => 'TikTok'],
    ];

    /**
     * Build the filter option lists consumed by the Campaign Report filter panel.
     *
     * @return array{
     *     users: array<int, array{id: int, name: string}>,
     *     accounts: array<int, array{id: int, account_id: string, account_name: string|null, ads_type: string|null}>,
     *     campaigns: array<int, array{campaign_id: string, campaign_name: string|null, ads_type: string|null, account_id: string|null}>,
     *     channels: array<int, array{code: string, name: string|null}>,
     *     ads_types: array<int, array{value: string, label: string}>,
     * }
     */
    public function options(): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        return [
            'users' => $this->users($ownership),
            'accounts' => $this->accounts($ownership),
            'campaigns' => $this->campaigns($ownership),
            'channels' => $this->reportChannels($ownership),
            'ads_types' => self::ADS_TYPES,
        ];
    }

    /**
     * @return array<int, array{code: string, name: string|null}>
     */
    private function reportChannels(OwnershipFilter $ownership): array
    {
        $query = RevenueChartReport::query()
            ->select(['channel_code'])
            ->whereNotNull('channel_code')
            ->groupBy('channel_code')
            ->orderBy('channel_code');

        $ownership->applyTo($query, 'owner_user_id');

        return $query->get()
            ->map(fn (RevenueChartReport $report) => [
                'code' => (string) $report->channel_code,
                'name' => null,
            ])
            ->all();
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function users(OwnershipFilter $ownership): array
    {
        $query = User::query()->select(['id', 'name'])->orderBy('name');

        if (! $ownership->isAdmin()) {
            $query->whereIn('id', $ownership->allowedUserIds());
        }

        return $query->get()
            ->map(fn (User $u) => ['id' => (int) $u->id, 'name' => (string) $u->name])
            ->all();
    }

    /**
     * @return array<int, array{id: int, account_id: string, account_name: string|null, ads_type: string|null}>
     */
    private function accounts(OwnershipFilter $ownership): array
    {
        $query = Account::query()
            ->select(['id', 'account_id', 'account_name', 'ads_type'])
            ->orderBy('account_name');

        if (! $ownership->isAdmin()) {
            $query->whereIn(
                'id',
                DB::table('account_user')
                    ->whereIn('user_id', $ownership->allowedUserIds())
                    ->select('account_id'),
            );
        }

        return $query->get()
            ->map(fn (Account $a) => [
                'id' => (int) $a->id,
                'account_id' => (string) $a->account_id,
                'account_name' => $a->account_name,
                'ads_type' => $a->ads_type,
            ])
            ->all();
    }

    /**
     * Distinct (campaign_id, campaign_name) pairs from campaign_reports within ownership scope.
     *
     * @return array<int, array{campaign_id: string, campaign_name: string|null, ads_type: string|null, account_id: string|null}>
     */
    private function campaigns(OwnershipFilter $ownership): array
    {
        $query = CampaignReport::query()
            ->select(['campaign_id', 'campaign_name', 'ads_type', 'account_id'])
            ->whereNotNull('campaign_id')
            ->groupBy('campaign_id', 'campaign_name', 'ads_type', 'account_id')
            ->orderBy('campaign_name');

        $this->applyAccountOwnership($query, $ownership);

        return $query->get()
            ->map(fn (CampaignReport $r) => [
                'campaign_id' => (string) $r->campaign_id,
                'campaign_name' => $r->campaign_name,
                'ads_type' => $r->ads_type,
                'account_id' => $r->account_id !== null ? (string) $r->account_id : null,
            ])
            ->all();
    }

    /**
     * Restrict a CampaignReport query by the auth user's accessible accounts.
     *
     * @param  Builder<CampaignReport>  $query
     */
    private function applyAccountOwnership($query, OwnershipFilter $ownership): void
    {
        $ownership->applyThroughAccount($query);
    }
}

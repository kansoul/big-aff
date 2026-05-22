<?php

namespace App\Actions\Adx\Report;

use App\Models\AdxCampaignReport;
use App\Support\OwnerResource\AdxAccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListAdxCampaignReportsAction
{
    public const ORDERABLE_COLUMNS = [
        'id',
        'date',
        'source',
        'account_id',
        'campaign_id',
        'spend',
        'revenue',
        'profit',
        'roi',
        'roas',
        'landing_view',
        'get_game_link_click',
        'detail_view',
        'get_bonus_click',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = $this->buildBaseQuery($filters, withRelations: true);

        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'date', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function filters(array $filters = []): array
    {
        $query = $this->buildBaseQuery($filters);

        $accounts = (clone $query)
            ->whereNotNull('account_id')
            ->selectRaw('account_id, MAX(account_name) as account_name')
            ->groupBy('account_id')
            ->orderBy('account_id')
            ->limit(1000)
            ->get()
            ->map(fn (AdxCampaignReport $report): array => [
                'account_id' => $report->account_id,
                'account_name' => $report->account_name,
            ])
            ->values()
            ->all();

        $campaigns = (clone $query)
            ->whereNotNull('campaign_id')
            ->selectRaw('campaign_id, MAX(campaign_name) as campaign_name')
            ->groupBy('campaign_id')
            ->orderBy('campaign_id')
            ->limit(2000)
            ->get()
            ->map(fn (AdxCampaignReport $report): array => [
                'campaign_id' => $report->campaign_id,
                'campaign_name' => $report->campaign_name,
            ])
            ->values()
            ->all();

        $games = (clone $query)
            ->whereNotNull('adx_game_id')
            ->with('game:id,name,slug')
            ->select('adx_game_id')
            ->distinct()
            ->limit(1000)
            ->get()
            ->map(fn (AdxCampaignReport $report): array => [
                'id' => $report->adx_game_id,
                'name' => $report->game?->name,
                'slug' => $report->game?->slug,
            ])
            ->sortBy(fn (array $game): string => (string) ($game['name'] ?? $game['id'] ?? ''))
            ->values()
            ->all();

        $links = (clone $query)
            ->whereNotNull('adx_link_id')
            ->with('link:id,name,landing_url')
            ->select('adx_link_id')
            ->distinct()
            ->limit(1000)
            ->get()
            ->map(fn (AdxCampaignReport $report): array => [
                'id' => $report->adx_link_id,
                'name' => $report->link?->name,
                'landing_url' => $report->link?->landing_url,
            ])
            ->sortBy(fn (array $link): string => (string) ($link['name'] ?? $link['id'] ?? ''))
            ->values()
            ->all();

        return compact('accounts', 'campaigns', 'games', 'links');
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<AdxCampaignReport>
     */
    private function buildBaseQuery(array $filters, bool $withRelations = false): Builder
    {
        $query = AdxCampaignReport::query()
            ->when($withRelations, fn ($q) => $q->with(['account', 'campaign', 'linkData', 'link', 'game', 'realtimeReport']))
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('date', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('date', '<=', $filters['date_to']))
            ->when(! empty($filters['keyword']), function ($q) use ($filters): void {
                $keyword = $filters['keyword'];
                $q->where(function ($inner) use ($keyword): void {
                    $inner->where('account_id', 'like', "%{$keyword}%")
                        ->orWhere('account_name', 'like', "%{$keyword}%")
                        ->orWhere('campaign_id', 'like', "%{$keyword}%")
                        ->orWhere('campaign_name', 'like', "%{$keyword}%")
                        ->orWhereHas('link', fn ($link) => $link->where('name', 'like', "%{$keyword}%"))
                        ->orWhereHas('game', fn ($game) => $game->where('name', 'like', "%{$keyword}%"));
                });
            })
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['account_id']), fn ($q) => $q->where('account_id', $filters['account_id']))
            ->when(! empty($filters['account_ids']), fn ($q) => $q->whereIn('account_id', $filters['account_ids']))
            ->when(! empty($filters['campaign_id']), fn ($q) => $q->where('campaign_id', $filters['campaign_id']))
            ->when(! empty($filters['campaign_ids']), fn ($q) => $q->whereIn('campaign_id', $filters['campaign_ids']))
            ->when(! empty($filters['adx_link_data_id']), fn ($q) => $q->where('adx_link_data_id', $filters['adx_link_data_id']))
            ->when(! empty($filters['adx_link_id']), fn ($q) => $q->where('adx_link_id', $filters['adx_link_id']))
            ->when(! empty($filters['adx_link_ids']), fn ($q) => $q->whereIn('adx_link_id', $filters['adx_link_ids']))
            ->when(! empty($filters['adx_game_id']), fn ($q) => $q->where('adx_game_id', $filters['adx_game_id']))
            ->when(! empty($filters['adx_game_ids']), fn ($q) => $q->whereIn('adx_game_id', $filters['adx_game_ids']));

        (new AdxAccountLinkedOwnerResource)->applyTo($query);

        return $query;
    }
}

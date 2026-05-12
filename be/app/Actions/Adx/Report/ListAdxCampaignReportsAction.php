<?php

namespace App\Actions\Adx\Report;

use App\Models\AdxCampaignReport;
use App\Support\OwnerResource\AdxAccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxCampaignReportsAction
{
    public const array ORDERABLE_COLUMNS = [
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
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxCampaignReport::query()
            ->with(['account', 'campaign', 'linkData', 'link', 'game', 'realtimeReport'])
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('date', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('date', '<=', $filters['date_to']))
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['account_id']), fn ($q) => $q->where('account_id', $filters['account_id']))
            ->when(! empty($filters['campaign_id']), fn ($q) => $q->where('campaign_id', $filters['campaign_id']))
            ->when(! empty($filters['adx_link_data_id']), fn ($q) => $q->where('adx_link_data_id', $filters['adx_link_data_id']))
            ->when(! empty($filters['adx_link_id']), fn ($q) => $q->where('adx_link_id', $filters['adx_link_id']))
            ->when(! empty($filters['adx_game_id']), fn ($q) => $q->where('adx_game_id', $filters['adx_game_id']));

        (new AdxAccountLinkedOwnerResource)->applyTo($query);
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'date', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

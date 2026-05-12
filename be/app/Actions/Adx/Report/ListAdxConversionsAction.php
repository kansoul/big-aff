<?php

namespace App\Actions\Adx\Report;

use App\Models\AdxConversion;
use App\Support\OwnerResource\AdxAccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxConversionsAction
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxConversion::query()
            ->with('linkData')
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('occurred_at', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('occurred_at', '<=', $filters['date_to']))
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['account_id']), fn ($q) => $q->where('account_id', $filters['account_id']))
            ->when(! empty($filters['campaign_id']), fn ($q) => $q->where('campaign_id', $filters['campaign_id']))
            ->when(! empty($filters['adx_link_data_id']), fn ($q) => $q->where('adx_link_data_id', $filters['adx_link_data_id']));

        (new AdxAccountLinkedOwnerResource)->applyTo($query);
        SortInput::fromValidatedArray($filters, ['id', 'source', 'account_id', 'campaign_id', 'conversion_type', 'sync_status', 'occurred_at', 'created_at'], 'occurred_at', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

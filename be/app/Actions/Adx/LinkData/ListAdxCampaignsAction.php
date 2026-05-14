<?php

namespace App\Actions\Adx\LinkData;

use App\Models\AdxAccount;
use App\Models\AdxCampaign;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxCampaignsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'source', 'campaign_id', 'status', 'last_seen_at', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxCampaign::query()
            ->with('account')
            ->when(! empty($filters['keyword']), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('campaign_id', 'like', '%'.$filters['keyword'].'%')
                ->orWhere('campaign_name', 'like', '%'.$filters['keyword'].'%')
                ->orWhereHas('account', fn ($accountQuery) => $accountQuery
                    ->where('account_id', 'like', '%'.$filters['keyword'].'%')
                    ->orWhere('account_name', 'like', '%'.$filters['keyword'].'%'))))
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['adx_account_id']), fn ($q) => $q->where('adx_account_id', $filters['adx_account_id']))
            ->when(! empty($filters['account_id']), fn ($q) => $q->whereHas('account', fn ($accountQuery) => $accountQuery->where('account_id', $filters['account_id'])))
            ->when(! empty($filters['campaign_id']), fn ($q) => $q->where('campaign_id', $filters['campaign_id']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']));

        OwnershipFilter::forAuthUser()->applyThrough(
            $query,
            'adx_account_id',
            fn (array $ids) => AdxAccount::query()
                ->whereIn('created_by', $ids)
                ->orWhereHas('users', fn ($userQuery) => $userQuery->whereIn('users.id', $ids))
                ->select('account_id'),
        );
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'id', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\Adx\Report;

use App\Models\AdxLinkData;
use App\Models\AdxRealtimeReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxRealtimeReportsAction
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxRealtimeReport::query()
            ->with('linkData')
            ->when(! empty($filters['date_from']), fn ($q) => $q->whereDate('report_date', '>=', $filters['date_from']))
            ->when(! empty($filters['date_to']), fn ($q) => $q->whereDate('report_date', '<=', $filters['date_to']))
            ->when(! empty($filters['adx_link_data_id']), fn ($q) => $q->where('adx_link_data_id', $filters['adx_link_data_id']));

        OwnershipFilter::forAuthUser()->applyThrough(
            $query,
            'adx_link_data_id',
            fn (array $ids) => AdxLinkData::whereIn('account_id', function ($accountQuery) use ($ids): void {
                $accountQuery->select('adx_accounts.account_id')
                    ->from('adx_accounts')
                    ->join('adx_account_user', 'adx_account_user.adx_account_id', '=', 'adx_accounts.id')
                    ->whereIn('adx_account_user.user_id', $ids);
            })->select('id'),
        );

        SortInput::fromValidatedArray($filters, ['id', 'report_date', 'created_at'], 'report_date', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

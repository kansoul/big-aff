<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class ListAdxAccountsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'source', 'account_id', 'account_name', 'status', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxAccount::query()->with(['businessCenter', 'mainTeam', 'team', 'users']);

        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AdxAccountOwnerResource)->applyTo($query);
        }

        $query
            ->when(! empty($filters['query']), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('account_id', 'like', '%'.$filters['query'].'%')
                ->orWhere('account_name', 'like', '%'.$filters['query'].'%')))
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['business_center_id']), fn ($q) => $q->where('business_center_id', $filters['business_center_id']))
            ->when(! empty($filters['team_id']), fn ($q) => $q->where('team_id', $filters['team_id']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']));

        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'id', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

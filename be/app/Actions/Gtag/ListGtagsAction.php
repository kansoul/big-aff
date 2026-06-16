<?php

namespace App\Actions\Gtag;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListGtagsAction
{
    public const ORDERABLE_COLUMNS = [
        'id',
        'account_id',
        'account_name',
        'created_at',
    ];

    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Account::query()
            ->with('gtag')
            ->where('ads_type', 'google')
            ->where('gtag_enabled', true)
            ->when(config('main_system.is_main'), function ($query): void {
                $query->whereNotNull('main_team_id')
                    ->whereHas('mainTeam', fn ($mainTeamQuery) => $mainTeamQuery->where('sync_campaign_reports', true));
            });

        (new AccountOwnerResource)->applyTo($query);

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('account_id', 'like', "%{$queryString}%")
                    ->orWhere('account_name', 'like', "%{$queryString}%");
            });
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

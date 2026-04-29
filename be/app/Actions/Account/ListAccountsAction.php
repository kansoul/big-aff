<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAccountsAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'account_id',
        'account_name',
        'ads_type',
        'status',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Account::query()->with(['businessCenter', 'team']);
        $ownership->applyThroughAccount($query);

        if (! empty($filters['query'])) {
            $queryString = $filters['query'];
            $query->where(function ($builder) use ($queryString): void {
                $builder->where('account_id', 'like', "%{$queryString}%")
                    ->orWhere('account_name', 'like', "%{$queryString}%");
            });
        }

        if (! empty($filters['ads_type'])) {
            $query->where('ads_type', $filters['ads_type']);
        }

        if (! empty($filters['business_center_id'])) {
            $query->where('business_center_id', $filters['business_center_id']);
        }

        if (! empty($filters['team_id'])) {
            $query->where('team_id', $filters['team_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListGoogleConversionsAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'account_id',
        'account_name',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Account::query()
            ->with('conversion')
            ->where('ads_type', 'google');

        $ownership->applyTo($query);

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
            defaultColumn: 'account_name',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

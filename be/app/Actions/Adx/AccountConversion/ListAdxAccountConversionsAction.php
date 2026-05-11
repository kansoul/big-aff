<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdxAccountConversionsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'source', 'account_id', 'conversion_type', 'status', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdxAccountConversion::query()
            ->when(! empty($filters['source']), fn ($q) => $q->where('source', $filters['source']))
            ->when(! empty($filters['account_id']), fn ($q) => $q->where('account_id', $filters['account_id']))
            ->when(! empty($filters['conversion_type']), fn ($q) => $q->where('conversion_type', $filters['conversion_type']))
            ->when(! empty($filters['status']), fn ($q) => $q->where('status', $filters['status']));

        (new AdxAccountLinkedOwnerResource)->applyTo($query);
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'id', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

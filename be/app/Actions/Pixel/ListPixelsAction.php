<?php

namespace App\Actions\Pixel;

use App\Models\Account;
use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListPixelsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'pixel_id', 'name', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Pixel::query()->with('account:id,account_id,account_name,ads_type');
        OwnershipFilter::forAuthUser()->applyThrough($query, 'account_id', fn (array $ids) => Account::query()->join('account_user', 'account_user.account_id', '=', 'accounts.id')->whereIn('account_user.user_id', $ids)->select('accounts.id'));
        $query->when($filters['account_id'] ?? null, fn ($q, $id) => $q->where('account_id', $id))
            ->when($filters['query'] ?? null, fn ($q, $value) => $q->where(fn ($inner) => $inner->where('pixel_id', 'like', "%{$value}%")->orWhere('name', 'like', "%{$value}%")));
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, defaultColumn: 'id', defaultDirection: 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

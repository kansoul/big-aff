<?php

namespace App\Actions\Adx\Account;

use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListUsersWithAdxAccountsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'email', 'created_at'];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = User::query()->with('adxAccounts');
        (new UserOwnerResource)->applyTo($query);

        $query->when(! empty($filters['query']), fn ($q) => $q->where(fn ($inner) => $inner
            ->where('name', 'like', '%'.$filters['query'].'%')
            ->orWhere('email', 'like', '%'.$filters['query'].'%')));

        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, 'id', 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

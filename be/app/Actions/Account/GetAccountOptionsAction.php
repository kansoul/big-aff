<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetAccountOptionsAction
{
    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null}>
     */
    public function execute(): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Account::query()
            ->select(['id', 'account_id', 'account_name'])
            ->orderBy('account_name');
        $ownership->applyTo($query);

        return $query->get();
    }
}

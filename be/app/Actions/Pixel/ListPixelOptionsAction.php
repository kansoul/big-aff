<?php

namespace App\Actions\Pixel;

use App\Models\Account;
use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class ListPixelOptionsAction
{
    /** @return Collection<int, Pixel> */
    public function execute(int $accountId): Collection
    {
        $query = Pixel::query()
            ->select(['id', 'account_id', 'pixel_id', 'name'])
            ->where('account_id', $accountId)
            ->orderBy('name')
            ->orderBy('pixel_id');

        OwnershipFilter::forAuthUser()->applyThrough(
            $query,
            'account_id',
            fn (array $userIds) => Account::query()
                ->join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $userIds)
                ->select('accounts.id'),
        );

        return $query->get();
    }
}

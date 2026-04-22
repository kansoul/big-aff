<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GetAccountOptionsAction
{
    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}>
     */
    public function execute(?int $userId = null): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Account::query()
            ->select(['id', 'account_id', 'account_name', 'team_id'])
            ->orderBy('account_name');
        $ownership->applyTo($query);

        if ($userId !== null) {
            $teamIds = DB::table('team_user')
                ->where('user_id', $userId)
                ->pluck('team_id')
                ->all();

            $query->whereIn('team_id', $teamIds);

            // Exclude accounts already assigned to other users
            $query->whereNotExists(function ($sub) use ($userId): void {
                $sub->select(DB::raw(1))
                    ->from('account_user')
                    ->whereColumn('account_user.account_id', 'accounts.id')
                    ->where('account_user.user_id', '!=', $userId);
            });
        }

        return $query->get();
    }
}

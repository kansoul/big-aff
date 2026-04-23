<?php

namespace App\Actions\Site;

use App\Enums\Permission;
use App\Models\Site;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetSiteUserOptionsAction
{
    /**
     * @return array{options: Collection<int, array{id: int, name: string, email: string}>, assigned_user_ids: array<int>}
     */
    public function execute(Site $site): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereDoesntHave('role', fn ($q) => $q->where('permissions', Permission::FULL_ACCESS_SENTINEL))
            ->orderBy('name');

        $ownership->applyTo($query);

        $options = $query->get();

        $assignedUserIds = $site->users()->pluck('users.id')->map(fn ($id) => (int) $id)->all();

        return [
            'options' => $options,
            'assigned_user_ids' => $assignedUserIds,
        ];
    }
}

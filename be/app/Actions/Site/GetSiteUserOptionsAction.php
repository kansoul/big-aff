<?php

namespace App\Actions\Site;

use App\Enums\Permission;
use App\Models\Site;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Collection;

class GetSiteUserOptionsAction
{
    /**
     * @return array{options: Collection<int, array{id: int, name: string, email: string}>, assigned_user_ids: array<int>}
     */
    public function execute(Site $site): array
    {
        $assignedUserIds = $site->users()->pluck('users.id')->map(fn ($id) => (int) $id)->all();

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereDoesntHave('role', fn ($q) => $q->where('permissions', Permission::FULL_ACCESS_SENTINEL))
            ->orderBy('id');
        (new UserOwnerResource)->applyTo($query);

        $options = $query->get();
        $optionUserIds = $options->pluck('id')->map(fn ($id) => (int) $id)->all();
        $assignedUserIds = array_values(array_intersect($assignedUserIds, $optionUserIds));

        return [
            'options' => $options,
            'assigned_user_ids' => $assignedUserIds,
        ];
    }
}

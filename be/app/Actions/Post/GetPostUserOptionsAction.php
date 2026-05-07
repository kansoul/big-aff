<?php

namespace App\Actions\Post;

use App\Enums\Permission;
use App\Models\Post;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Collection;

class GetPostUserOptionsAction
{
    /**
     * @return array{options: Collection<int, array{id: int, name: string, email: string}>, assigned_user_ids: array<int>}
     */
    public function execute(Post $post): array
    {
        OwnershipFilter::forAuthUser()->authorizePost($post);

        $assignedUserIds = $post->assignedUsers()->pluck('users.id')->map(fn ($id) => (int) $id)->all();

        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->whereDoesntHave('role', fn ($q) => $q->where('permissions', Permission::FULL_ACCESS_SENTINEL))
            ->orderBy('name');

        (new UserOwnerResource)->applyTo($query);

        $options = $query->get();
        $optionUserIds = $options->pluck('id')->map(fn ($id) => (int) $id)->all();

        return [
            'options' => $options,
            'assigned_user_ids' => array_values(array_intersect($assignedUserIds, $optionUserIds)),
        ];
    }
}

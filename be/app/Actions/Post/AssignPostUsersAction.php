<?php

namespace App\Actions\Post;

use App\Enums\Permission;
use App\Models\Post;
use App\Models\PostUser;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class AssignPostUsersAction
{
    /**
     * @param  array<int>  $userIds
     *
     * @throws AuthorizationException
     */
    public function execute(Post $post, array $userIds): void
    {
        OwnershipFilter::forAuthUser()->authorizePost($post);

        $assignableUserIds = $this->getAssignableUserIds();
        $userIds = array_values(array_unique(array_intersect($userIds, $assignableUserIds)));
        $assignedUserIds = $post->assignedUsers()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $assignedInScope = array_values(array_intersect($assignedUserIds, $assignableUserIds));

        $toRemove = array_values(array_diff($assignedInScope, $userIds));
        $toAdd = array_values(array_diff($userIds, $assignedUserIds));

        if (empty($toRemove) && empty($toAdd)) {
            return;
        }

        DB::transaction(function () use ($post, $toRemove, $toAdd): void {
            if (! empty($toRemove)) {
                PostUser::query()
                    ->where('post_id', $post->id)
                    ->whereIn('user_id', $toRemove)
                    ->delete();
            }

            if (! empty($toAdd)) {
                $now = now();
                PostUser::query()->insert(array_map(fn (int $userId) => [
                    'post_id' => $post->id,
                    'user_id' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toAdd));
            }
        });
    }

    /**
     * @return array<int>
     */
    private function getAssignableUserIds(): array
    {
        $query = User::query()
            ->select('id')
            ->whereDoesntHave('role', fn ($q) => $q->where('permissions', Permission::FULL_ACCESS_SENTINEL));

        (new UserOwnerResource)->applyTo($query);

        return $query->pluck('id')->map(fn ($id) => (int) $id)->all();
    }
}

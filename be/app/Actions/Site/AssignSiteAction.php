<?php

namespace App\Actions\Site;

use App\Enums\Permission;
use App\Models\Site;
use App\Models\User;
use App\Models\UserSite;
use App\Support\OwnerResource\UserOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class AssignSiteAction
{
    /**
     * @param  array<int>  $userIds
     *
     * @throws AuthorizationException
     */
    public function execute(Site $site, array $userIds): void
    {
        $ownership = OwnershipFilter::forAuthUser();
        $assignedUserIds = $site->users()->pluck('users.id')->map(fn ($id) => (int) $id)->all();

        if (! $ownership->isAdmin()) {
            $ownership->authorizeSite($site);
        }

        $assignableUserIds = $this->getAssignableUserIds();
        $userIds = array_values(array_intersect($userIds, $assignableUserIds));
        $assignedInScope = $this->getAssignedInScope($site, $assignableUserIds);
        $toRemove = array_values(array_diff($assignedInScope, $userIds));
        $toAdd = array_values(array_diff($userIds, $assignedUserIds));

        if (empty($toRemove) && empty($toAdd)) {
            return;
        }
        DB::transaction(function () use ($site, $toRemove, $toAdd): void {
            $this->addAssignments($site, $toAdd);
            $this->removeAssignments($site, $toRemove);
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

    /**
     * @param  array<int>  $assignableUserIds
     * @return array<int>
     */
    private function getAssignedInScope(Site $site, array $assignableUserIds): array
    {
        $query = UserSite::query()
            ->where('site_id', $site->id)
            ->whereNull('deleted_at')
            ->whereIn('user_id', $assignableUserIds);

        return $query->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }

    /**
     * @param  array<int>  $userIds
     */
    private function removeAssignments(Site $site, array $userIds): void
    {
        if (empty($userIds)) {
            return;
        }

        UserSite::query()
            ->where('site_id', $site->id)
            ->whereIn('user_id', $userIds)
            ->whereNull('deleted_at')
            ->update(['deleted_at' => now(), 'updated_at' => now()]);
    }

    /**
     * @param  array<int>  $userIds
     */
    private function addAssignments(Site $site, array $userIds): void
    {
        if (empty($userIds)) {
            return;
        }

        UserSite::query()
            ->withTrashed()
            ->where('site_id', $site->id)
            ->whereIn('user_id', $userIds)
            ->whereNotNull('deleted_at')
            ->update(['deleted_at' => null, 'updated_at' => now()]);

        $existing = UserSite::withTrashed()
            ->where('site_id', $site->id)
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $toInsert = array_diff($userIds, $existing);

        if (! empty($toInsert)) {
            $now = now();
            UserSite::insert(array_map(fn (int $userId) => [
                'user_id' => $userId,
                'site_id' => $site->id,
                'created_at' => $now,
                'updated_at' => $now,
            ], $toInsert));
        }
    }
}

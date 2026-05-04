<?php

namespace App\Actions\Site;

use App\Models\Site;
use App\Models\UserSite;
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

            $userIds = array_values(array_intersect($userIds, $ownership->allowedUserIds()));
        }

        $assignedInScope = $this->getAssignedInScope($site, $ownership);
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
    private function getAssignedInScope(Site $site, OwnershipFilter $ownership): array
    {
        $query = UserSite::query()
            ->where('site_id', $site->id)
            ->whereNull('deleted_at');

        if (! $ownership->isAdmin()) {
            $query->whereIn('user_id', $ownership->allowedUserIds());
        }

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

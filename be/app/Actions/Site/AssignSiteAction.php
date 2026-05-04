<?php

namespace App\Actions\Site;

use App\Models\Site;
use App\Models\UserSite;
use App\Support\OwnerResource\SiteOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
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
        $resource = new SiteOwnerResource;
        $removableIds = null; // null = admin (unrestricted), array = subtree minus self

        if (! $resource->isAdmin()) {
            $authId = (int) Auth::id();
            $allowedIds = $resource->allowedUserIds();

            // Non-admin must have created the site or be currently assigned to it.
            $hasAccess = $site->created_by === $authId
                || UserSite::query()->where('site_id', $site->id)->where('user_id', $authId)->whereNull('deleted_at')->exists();

            if (! $hasAccess) {
                throw new AuthorizationException;
            }

            // Can only assign users within their allowed subtree; self is always kept.
            $userIds = array_values(array_intersect($userIds, $allowedIds));
            if (! in_array($authId, $userIds, true)) {
                $userIds[] = $authId;
            }

            // Removable = subtree excluding self (self is protected above).
            $removableIds = array_values(array_diff($allowedIds, [$authId]));
        }

        DB::transaction(function () use ($site, $userIds, $removableIds): void {
            $this->syncRemovals($site, $userIds, $removableIds);
            $this->syncAdditions($site, $userIds);
        });
    }

    /**
     * Soft-delete pivot rows that are no longer in $userIds.
     * $removableIds === null means admin — remove anyone not in the new list.
     * $removableIds === [] means non-admin with no subtree — nothing to remove.
     *
     * @param  array<int>  $userIds
     * @param  array<int>|null  $removableIds
     */
    private function syncRemovals(Site $site, array $userIds, ?array $removableIds): void
    {
        $query = UserSite::query()
            ->where('site_id', $site->id)
            ->whereNotIn('user_id', $userIds)
            ->whereNull('deleted_at');

        if ($removableIds !== null) {
            if (empty($removableIds)) {
                return;
            }
            $query->whereIn('user_id', $removableIds);
        }

        $query->update(['deleted_at' => now(), 'updated_at' => now()]);
    }

    /**
     * Restore soft-deleted pivots and insert brand-new rows for $userIds.
     *
     * @param  array<int>  $userIds
     */
    private function syncAdditions(Site $site, array $userIds): void
    {
        UserSite::query()
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

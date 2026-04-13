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
        $ownership->authorize($site->created_by);

        // Admins may assign any user; others are limited to their allowed subtree.
        if (! $ownership->isAdmin()) {
            $userIds = array_values(array_intersect($userIds, $ownership->allowedUserIds()));
        }

        DB::transaction(function () use ($site, $userIds): void {
            // Restore soft-deleted pivots for users that were previously removed
            UserSite::query()
                ->where('site_id', $site->id)
                ->whereIn('user_id', $userIds)
                ->whereNotNull('deleted_at')
                ->update(['deleted_at' => null, 'updated_at' => now()]);

            // Determine which user_ids do not yet have a pivot row
            $existing = UserSite::query()
                ->where('site_id', $site->id)
                ->whereIn('user_id', $userIds)
                ->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_diff($userIds, $existing);

            if (! empty($toInsert)) {
                $now = now();
                $rows = array_map(fn (int $userId) => [
                    'user_id' => $userId,
                    'site_id' => $site->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toInsert);

                UserSite::insert($rows);
            }
        });
    }
}

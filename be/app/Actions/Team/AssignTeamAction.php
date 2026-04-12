<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class AssignTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Team $team, array $data): void
    {
        $ownership = OwnershipFilter::forAuthUser();
        $ownership->authorize($team->created_by);

        // Admins may assign any user; others are limited to their allowed subtree.
        $userIds = $ownership->isAdmin()
            ? $data['user_ids']
            : array_values(array_intersect($data['user_ids'], $ownership->allowedUserIds()));
        $teamRole = $data['team_role'] ?? TeamRole::MEMBER->value;
        DB::transaction(function () use ($team, $userIds, $teamRole): void {
            $existing = TeamUser::query()
                ->where('team_id', $team->id)
                ->whereIn('user_id', $userIds)
                ->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_diff($userIds, $existing);

            if (! empty($toInsert)) {
                $now = now();
                $rows = array_map(fn (int $userId) => [
                    'team_id' => $team->id,
                    'user_id' => $userId,
                    'team_role' => $teamRole,
                    'joined_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toInsert);

                TeamUser::insert($rows);
            }
        });
    }
}

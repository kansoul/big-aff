<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use App\Support\OwnerResource\TeamOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssignTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed> { inserted: int[], conflicts: array<array{user_id: int, user_name: string, team_id: int, team_name: string}> }
     *
     * @throws AuthorizationException
     */
    public function execute(Team $team, array $data): array
    {
        $resource = new TeamOwnerResource;
        $resource->authorize($team);

        // Admins may assign any user; others are limited to their allowed subtree
        // plus any users they directly created (created_by = auth user).
        $userIds = $resource->isAdmin()
            ? $data['user_ids']
            : array_values(array_intersect(
                $data['user_ids'],
                array_unique(array_merge(
                    $resource->allowedUserIds(),
                    User::query()->where('created_by', Auth::id())->pluck('id')->map(fn ($id) => (int) $id)->all(),
                )),
            ));
        $teamRole = $data['team_role'] ?? TeamRole::MEMBER->value;

        return DB::transaction(function () use ($team, $userIds, $teamRole): array {
            if ($teamRole === TeamRole::LEADER->value) {
                $removedLeaderIds = TeamUser::query()
                    ->where('team_id', $team->id)
                    ->where('team_role', TeamRole::LEADER->value)
                    ->whereNotIn('user_id', $userIds)
                    ->pluck('user_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                if (! empty($removedLeaderIds)) {
                    UserParentChild::query()
                        ->whereIn('parent_user_id', $removedLeaderIds)
                        ->delete();
                }
            }

            TeamUser::query()
                ->where('team_id', $team->id)
                ->where('team_role', $teamRole)
                ->whereNotIn('user_id', $userIds)
                ->delete();

            $alreadyInThisTeam = TeamUser::query()
                ->where('team_id', $team->id)
                ->whereIn('user_id', $userIds)
                ->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $candidates = array_diff($userIds, $alreadyInThisTeam);

            $conflicts = [];
            $toInsert = $candidates;

            // For leader/member roles, a user may only belong to one team.
            if (in_array($teamRole, [TeamRole::LEADER->value, TeamRole::MEMBER->value], true) && ! empty($candidates)) {
                $conflictRows = TeamUser::query()
                    ->with('team:id,name')
                    ->whereIn('user_id', $candidates)
                    ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
                    ->get(['user_id', 'team_id', 'team_role']);
                $conflictUserIds = $conflictRows->pluck('user_id')->map(fn ($id) => (int) $id)->all();
                $toInsert = array_values(array_diff($candidates, $conflictUserIds));

                if (! empty($conflictUserIds)) {
                    $userNames = User::whereIn('id', $conflictUserIds)->pluck('name', 'id');

                    foreach ($conflictRows as $row) {
                        $userId = (int) $row->user_id;
                        $conflicts[] = [
                            'user_id' => $userId,
                            'user_name' => $userNames[$userId] ?? (string) $userId,
                            'team_id' => $row->team_id,
                            'team_name' => $row->team->name ?? (string) $row->team_id,
                        ];
                    }
                }
            }

            if (! empty($toInsert)) {
                $now = now();
                $isSingleTeamRole = in_array($teamRole, [TeamRole::LEADER->value, TeamRole::MEMBER->value], true);
                $rows = array_map(fn (int $userId) => [
                    'team_id' => $team->id,
                    'user_id' => $userId,
                    'team_role' => $teamRole,
                    'single_team_key' => $isSingleTeamRole ? $userId : null,
                    'joined_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toInsert);

                TeamUser::insert($rows);
            }

            return [
                'inserted' => $toInsert,
                'conflicts' => $conflicts,
            ];
        });
    }
}

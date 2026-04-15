<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateUserAction
{
    /**
     * @param  array{name: string, email: string, password: string, role_id: int, parent_id?: int|null, team_id?: int|null}  $data
     */
    public function execute(array $data): User
    {
        $password = $data['password'];
        unset($data['password']);

        $parentId = $data['parent_id'] ?? null;
        unset($data['parent_id']);

        $teamId = $data['team_id'] ?? null;
        unset($data['team_id']);

        return DB::transaction(function () use ($data, $password, $parentId, $teamId): User {
            $user = User::query()->create([
                ...$data,
                'password' => $password,
            ]);

            if ($parentId !== null && $parentId !== '') {
                UserParentChild::query()->create([
                    'parent_user_id' => (int) $parentId,
                    'child_user_id' => $user->id,
                ]);
            }

            $this->autoAssignTeam($user, $teamId);

            $user->load(['role', 'assignedParentLink.parentUser']);

            return $user;
        });
    }

    private function autoAssignTeam(User $newUser, ?int $requestedTeamId): void
    {
        /** @var User|null $auth */
        $auth = Auth::user();
        if ($auth === null || $auth->is_admin) {
            return;
        }

        $leaderRow = TeamUser::query()
            ->where('user_id', $auth->id)
            ->where('team_role', TeamRole::LEADER)
            ->first();

        if ($leaderRow !== null) {
            // Auto-add to leader's team as member and set leader as parent
            TeamUser::query()->create([
                'team_id' => $leaderRow->team_id,
                'user_id' => $newUser->id,
                'joined_at' => now(),
                'team_role' => TeamRole::MEMBER,
            ]);

            // Ensure parent link is set to the leader
            UserParentChild::query()->updateOrCreate(
                ['child_user_id' => $newUser->id],
                ['parent_user_id' => $auth->id],
            );

            return;
        }

        // Auth user is a manager: find their manager teams
        $managerTeamIds = TeamUser::query()
            ->where('user_id', $auth->id)
            ->where('team_role', TeamRole::MANAGER)
            ->pluck('team_id')
            ->all();

        if (count($managerTeamIds) === 0) {
            return;
        }

        $resolvedTeamId = count($managerTeamIds) === 1
            ? $managerTeamIds[0]
            : $requestedTeamId;

        if ($resolvedTeamId === null) {
            return;
        }

        TeamUser::query()->create([
            'team_id' => (int) $resolvedTeamId,
            'user_id' => $newUser->id,
            'joined_at' => now(),
            'team_role' => TeamRole::MEMBER,
        ]);
    }
}

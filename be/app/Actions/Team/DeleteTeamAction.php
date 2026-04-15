<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\UserParentChild;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class DeleteTeamAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Team $team): void
    {
        OwnershipFilter::forAuthUser()->authorize($team->created_by);

        DB::transaction(function () use ($team): void {
            $memberIds = TeamUser::query()
                ->where('team_id', $team->id)
                ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
                ->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if (! empty($memberIds)) {
                UserParentChild::query()
                    ->whereIn('child_user_id', $memberIds)
                    ->delete();
            }

            TeamUser::query()->where('team_id', $team->id)->delete();

            $team->delete();
        });
    }
}

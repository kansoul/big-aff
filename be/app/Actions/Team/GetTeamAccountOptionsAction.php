<?php

namespace App\Actions\Team;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetTeamAccountOptionsAction
{
    /**
     * @return array{show_team_filter: bool, teams: Collection<int, array{id: int, name: string, accounts: Collection<int, array{id: int, account_id: string, account_name: string|null, ads_type: string, team_id: int}>}>}
     */
    public function execute(): array
    {
        /** @var User $user */
        $user = Auth::user();

        $managerTeamIds = TeamUser::query()
            ->where('user_id', $user->id)
            ->where('team_role', TeamRole::MANAGER->value)
            ->pluck('team_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $showTeamFilter = $user->is_admin || count($managerTeamIds) > 1;

        $teamQuery = Team::query()
            ->select(['id', 'name'])
            ->orderBy('name');

        $accountQuery = Account::query()
            ->select(['id', 'account_id', 'account_name', 'ads_type', 'team_id'])
            ->whereNotNull('team_id')
            ->orderBy('account_name')
            ->orderBy('account_id');

        if (! $user->is_admin) {
            if ($showTeamFilter) {
                $teamQuery->whereIn('id', $managerTeamIds);
                $accountQuery->whereIn('team_id', $managerTeamIds);
            } else {
                $teamIds = TeamUser::query()
                    ->where('user_id', $user->id)
                    ->pluck('team_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $teamQuery->whereIn('id', $teamIds);
                $accountQuery->whereHas('users', fn ($query) => $query->where('users.id', $user->id));
            }
        }

        $accountsByTeam = $accountQuery
            ->get()
            ->groupBy('team_id');

        return [
            'show_team_filter' => $showTeamFilter,
            'teams' => $teamQuery
                ->get()
                ->map(fn (Team $team) => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'accounts' => $accountsByTeam
                        ->get($team->id, collect())
                        ->map(fn (Account $account) => [
                            'id' => $account->id,
                            'account_id' => $account->account_id,
                            'account_name' => $account->account_name,
                            'ads_type' => $account->ads_type,
                            'team_id' => $account->team_id,
                        ])
                        ->values(),
                ]),
        ];
    }
}

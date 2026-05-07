<?php

namespace App\Actions\Option;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\MainTeam;
use App\Models\Team;
use App\Models\TeamUser;
use App\Support\AdsReport\AdsReportAccess;
use App\Support\OwnerResource\TeamOwnerResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetAdsReportOptionsAction
{
    /**
     * @return array{show_team_filter: bool, teams: Collection, campaigns: Collection}
     */
    public function execute(): array
    {
        $teamResource = new TeamOwnerResource;
        $user = Auth::user();
        $canViewUnscoped = AdsReportAccess::canViewUnscoped($user);

        // 1. Resolve accessible teams
        $managerTeamIds = TeamUser::query()
            ->where('user_id', Auth::id())
            ->where('team_role', TeamRole::MANAGER->value)
            ->pluck('team_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $showTeamFilter = $canViewUnscoped || $teamResource->isAdmin() || count($managerTeamIds) > 1;

        $teamQuery = Team::query()
            ->select(['id', 'name'])
            ->orderBy('name');

        if (! $canViewUnscoped) {
            $teamResource->applyTo($teamQuery);
        }

        $teams = $teamQuery->get();

        // 2. Fetch accounts scoped to the auth user's allowed user IDs within each team
        $allowedUserIds = $canViewUnscoped || $teamResource->isAdmin() ? null : $teamResource->allowedUserIds();

        $teamUserIdsByTeam = TeamUser::query()
            ->whereIn('team_id', $teams->pluck('id'))
            ->when($allowedUserIds !== null, fn ($q) => $q->whereIn('user_id', $allowedUserIds))
            ->get()
            ->groupBy('team_id')
            ->map(fn ($group) => $group->pluck('user_id')->all());

        $allUserIds = $teamUserIdsByTeam->flatten()->unique()->all();

        $accounts = Account::query()
            ->select(['id', 'account_id', 'account_name', 'ads_type', 'main_team_id'])
            ->when(
                ! $canViewUnscoped,
                fn ($query) => $query->whereHas('users', fn ($q) => $q->whereIn('users.id', $allUserIds)),
            )
            ->with(['users:id'])
            ->orderBy('account_name')
            ->get();

        $accountsData = $accounts->map(fn ($account) => [
            'id' => $account->id,
            'account_id' => $account->account_id,
            'account_name' => $account->account_name,
            'ads_type' => $account->ads_type,
            'main_team_id' => $account->main_team_id,
        ])->values();

        // Group accounts by team
        $teamsData = $teams->map(fn (Team $team) => [
            'id' => $team->id,
            'name' => $team->name,
            'accounts' => $accounts->filter(function ($account) use ($team, $teamUserIdsByTeam) {
                $teamUsers = $teamUserIdsByTeam->get($team->id, []);

                return $account->users->contains(fn ($u) => in_array($u->id, $teamUsers));
            })->map(fn ($account) => [
                'id' => $account->id,
                'account_id' => $account->account_id,
                'account_name' => $account->account_name,
                'ads_type' => $account->ads_type,
                'main_team_id' => $account->main_team_id,
            ])->values(),
        ]);

        // 3. Campaigns for all these accounts
        $campaigns = Campaign::query()
            ->select(['campaign_id', 'campaign_name', 'account_id', 'ads_type'])
            ->whereIn('account_id', $accounts->pluck('account_id'))
            ->orderBy('campaign_name')
            ->get();

        return [
            'can_view_unscoped' => $canViewUnscoped,
            'show_team_filter' => $showTeamFilter,
            'main_teams' => AdsReportAccess::canUseMainTeams($user)
                ? MainTeam::query()->select(['id', 'name'])->orderBy('name')->get()
                : collect(),
            'accounts' => $accountsData,
            'teams' => $teamsData,
            'campaigns' => $campaigns,
        ];
    }
}

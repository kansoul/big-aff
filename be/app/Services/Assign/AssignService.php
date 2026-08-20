<?php

namespace App\Services\Assign;

use App\Actions\Account\AssignAccountAction;
use App\Actions\Account\GetAccountAssignOptionsAction;
use App\Actions\Account\ListUsersWithAccountsAction;
use App\Actions\Team\AssignTeamAction;
use App\Actions\Team\GetTeamUserOptionsAction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AssignService
{
    public function __construct(
        private readonly ListUsersWithAccountsAction $listUsersWithAccountsAction,
        private readonly GetAccountAssignOptionsAction $getAccountAssignOptionsAction,
        private readonly AssignAccountAction $assignAccountAction,
        private readonly GetTeamUserOptionsAction $getTeamUserOptionsAction,
        private readonly AssignTeamAction $assignTeamAction,
    ) {}

    public function usersWithAccounts(array $filters): LengthAwarePaginator
    {
        return $this->listUsersWithAccountsAction->execute($filters);
    }

    /** @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}> */
    public function accountAssignOptions(?int $forUserId = null): Collection
    {
        return $this->getAccountAssignOptionsAction->execute($forUserId);
    }

    /** @return array{skipped_account_ids: list<string>} */
    public function assignAccountsToUser(User $user, array $accountIds): array
    {
        return $this->assignAccountAction->execute($user, $accountIds);
    }

    /** @return Collection<int, array{id: int, name: string, email: string}> */
    public function teamUserOptions(Team $team): Collection
    {
        return $this->getTeamUserOptionsAction->execute($team);
    }

    /** @return array{inserted: int[], conflicts: array<array{user_id: int, user_name: string, team_id: int, team_name: string}>} */
    public function assignUsersToTeam(Team $team, array $data): array
    {
        return $this->assignTeamAction->execute($team, $data);
    }
}

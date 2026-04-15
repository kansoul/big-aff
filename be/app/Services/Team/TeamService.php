<?php

namespace App\Services\Team;

use App\Actions\Team\AssignTeamAction;
use App\Actions\Team\CreateTeamAction;
use App\Actions\Team\DeleteTeamAction;
use App\Actions\Team\GetTeamLeadersAction;
use App\Actions\Team\GetTeamOptionsAction;
use App\Actions\Team\GetTeamUserOptionsAction;
use App\Actions\Team\GetUserTeamOptionsAction;
use App\Actions\Team\ListTeamsAction;
use App\Actions\Team\UpdateTeamAction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class TeamService
{
    public function __construct(
        private readonly ListTeamsAction $listTeamsAction,
        private readonly CreateTeamAction $createTeamAction,
        private readonly UpdateTeamAction $updateTeamAction,
        private readonly DeleteTeamAction $deleteTeamAction,
        private readonly AssignTeamAction $assignTeamAction,
        private readonly GetTeamUserOptionsAction $getTeamUserOptionsAction,
        private readonly GetTeamOptionsAction $getTeamOptionsAction,
        private readonly GetTeamLeadersAction $getTeamLeadersAction,
        private readonly GetUserTeamOptionsAction $getUserTeamOptionsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listTeamsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Team
    {
        return $this->createTeamAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Team $team, array $data): Team
    {
        return $this->updateTeamAction->execute($team, $data);
    }

    public function delete(Team $team): void
    {
        $this->deleteTeamAction->execute($team);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function assign(Team $team, array $data): array
    {
        return $this->assignTeamAction->execute($team, $data);
    }

    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function userOptions(Team $team): Collection
    {
        return $this->getTeamUserOptionsAction->execute($team);
    }

    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    public function options(): Collection
    {
        return $this->getTeamOptionsAction->execute();
    }

    public function leaders(Team $team): Collection
    {
        return $this->getTeamLeadersAction->execute($team);
    }

    /**
     * @return Collection<int, array{id: int, name: string, team_role: string}>
     */
    public function userTeamOptions(User $user): Collection
    {
        return $this->getUserTeamOptionsAction->execute($user);
    }
}

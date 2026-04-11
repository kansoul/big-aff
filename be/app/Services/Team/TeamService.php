<?php

namespace App\Services\Team;

use App\Actions\Team\AssignTeamAction;
use App\Actions\Team\CreateTeamAction;
use App\Actions\Team\DeleteTeamAction;
use App\Actions\Team\GetTeamUserOptionsAction;
use App\Actions\Team\ListTeamsAction;
use App\Actions\Team\UpdateTeamAction;
use App\Models\Team;
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
     */
    public function assign(Team $team, array $data): void
    {
        $this->assignTeamAction->execute($team, $data);
    }

    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function userOptions(Team $team): Collection
    {
        return $this->getTeamUserOptionsAction->execute($team);
    }
}

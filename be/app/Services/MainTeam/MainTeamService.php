<?php

namespace App\Services\MainTeam;

use App\Actions\MainTeam\CreateMainTeamAction;
use App\Actions\MainTeam\DeleteMainTeamAction;
use App\Actions\MainTeam\ListMainTeamsAction;
use App\Actions\MainTeam\UpdateMainTeamAction;
use App\Models\MainTeam;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class MainTeamService
{
    public function __construct(
        private readonly ListMainTeamsAction $listMainTeamsAction,
        private readonly CreateMainTeamAction $createMainTeamAction,
        private readonly UpdateMainTeamAction $updateMainTeamAction,
        private readonly DeleteMainTeamAction $deleteMainTeamAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listMainTeamsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): MainTeam
    {
        return $this->createMainTeamAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(MainTeam $mainTeam, array $data): MainTeam
    {
        return $this->updateMainTeamAction->execute($mainTeam, $data);
    }

    public function delete(MainTeam $mainTeam): void
    {
        $this->deleteMainTeamAction->execute($mainTeam);
    }
}

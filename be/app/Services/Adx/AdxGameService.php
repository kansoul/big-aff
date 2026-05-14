<?php

namespace App\Services\Adx;

use App\Actions\Adx\Game\AssignAdxGameAction;
use App\Actions\Adx\Game\CreateAdxGameAction;
use App\Actions\Adx\Game\DeleteAdxGameAction;
use App\Actions\Adx\Game\ListAdxGamesAction;
use App\Actions\Adx\Game\ListUsersWithAdxGamesAction;
use App\Actions\Adx\Game\UpdateAdxGameAction;
use App\Models\AdxGame;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdxGameService
{
    public function __construct(
        private readonly ListAdxGamesAction $listAction,
        private readonly CreateAdxGameAction $createAction,
        private readonly UpdateAdxGameAction $updateAction,
        private readonly DeleteAdxGameAction $deleteAction,
        private readonly ListUsersWithAdxGamesAction $listUsersAction,
        private readonly AssignAdxGameAction $assignAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    public function create(array $data): AdxGame
    {
        return $this->createAction->execute($data);
    }

    public function update(AdxGame $game, array $data): AdxGame
    {
        return $this->updateAction->execute($game, $data);
    }

    public function delete(AdxGame $game): void
    {
        $this->deleteAction->execute($game);
    }

    public function listUsersWithGames(array $filters): LengthAwarePaginator
    {
        return $this->listUsersAction->execute($filters);
    }

    public function assignToUser(User $user, array $gameIds): array
    {
        return $this->assignAction->execute($user, $gameIds);
    }
}

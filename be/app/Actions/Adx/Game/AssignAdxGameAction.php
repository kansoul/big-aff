<?php

namespace App\Actions\Adx\Game;

use App\Models\AdxGame;
use App\Models\User;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxGameOwnerResource;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Facades\Auth;

class AssignAdxGameAction
{
    /**
     * @param  array<int|string>  $gameIds
     * @return array{skipped_game_ids: list<int>}
     */
    public function execute(User $user, array $gameIds): array
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new UserOwnerResource)->authorize($user);
        }

        $requestedIds = collect($gameIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->values();

        $ownerResource = new AdxGameOwnerResource;
        $query = AdxGame::query()->select(['id']);
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            $ownerResource->applyTo($query);
        }

        $games = $query->whereIn('id', $requestedIds)->get();
        $existingIds = $user->adxGames()->pluck('adx_games.id');
        $visibleExistingQuery = AdxGame::query()->select(['id'])->whereIn('id', $existingIds);
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            $ownerResource->applyTo($visibleExistingQuery);
        }
        $visibleExistingIds = $visibleExistingQuery->pluck('id');
        $inaccessibleExistingIds = $existingIds->diff($visibleExistingIds);

        $user->adxGames()->sync($inaccessibleExistingIds->merge($games->pluck('id'))->unique()->values()->all());

        $foundIds = $games->pluck('id');

        return ['skipped_game_ids' => $requestedIds->diff($foundIds)->values()->all()];
    }
}

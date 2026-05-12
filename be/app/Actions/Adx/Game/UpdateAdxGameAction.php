<?php

namespace App\Actions\Adx\Game;

use App\Models\AdxGame;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;

class UpdateAdxGameAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdxGame $game, array $data): AdxGame
    {
        OwnershipFilter::forAuthUser()->authorize($game->created_by);

        $game->fill($data);
        $game->updated_by = Auth::id();
        $game->save();

        return $game->refresh();
    }
}

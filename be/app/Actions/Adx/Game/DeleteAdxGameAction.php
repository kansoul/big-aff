<?php

namespace App\Actions\Adx\Game;

use App\Models\AdxGame;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteAdxGameAction
{
    public function execute(AdxGame $game): void
    {
        OwnershipFilter::forAuthUser()->authorize($game->created_by);

        $game->delete();
    }
}

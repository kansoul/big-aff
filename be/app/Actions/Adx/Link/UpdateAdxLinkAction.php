<?php

namespace App\Actions\Adx\Link;

use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Support\OwnerResource\AdxGameOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;

class UpdateAdxLinkAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdxLink $link, array $data): AdxLink
    {
        $ownership = OwnershipFilter::forAuthUser();
        $ownership->authorize($link->created_by);

        if (! empty($data['adx_game_id'])) {
            $game = AdxGame::query()->findOrFail($data['adx_game_id']);
            (new AdxGameOwnerResource)->authorize($game);
        }

        $link->fill($data);
        $link->updated_by = Auth::id();
        $link->save();

        return $link->refresh();
    }
}

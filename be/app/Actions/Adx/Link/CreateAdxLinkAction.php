<?php

namespace App\Actions\Adx\Link;

use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Support\OwnerResource\AdxGameOwnerResource;
use Illuminate\Support\Facades\Auth;

class CreateAdxLinkAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdxLink
    {
        $game = AdxGame::query()->findOrFail($data['adx_game_id']);
        (new AdxGameOwnerResource)->authorize($game);

        $userId = Auth::id();

        return AdxLink::query()->create([
            'adx_game_id' => $game->id,
            'name' => $data['name'],
            'landing_url' => $data['landing_url'],
            'status' => $data['status'] ?? 'active',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }
}

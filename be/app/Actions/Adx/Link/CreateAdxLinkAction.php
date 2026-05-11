<?php

namespace App\Actions\Adx\Link;

use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CreateAdxLinkAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdxLink
    {
        $game = AdxGame::query()->findOrFail($data['adx_game_id']);
        OwnershipFilter::forAuthUser()->authorize($game->created_by);

        $userId = Auth::id();

        return AdxLink::query()->create([
            'adx_game_id' => $game->id,
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'source' => $data['source'],
            'landing_url' => $data['landing_url'],
            'url_template' => $data['url_template'] ?? null,
            'status' => $data['status'] ?? 'active',
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }
}

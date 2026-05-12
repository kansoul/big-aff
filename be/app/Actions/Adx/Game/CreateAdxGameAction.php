<?php

namespace App\Actions\Adx\Game;

use App\Models\AdxGame;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CreateAdxGameAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdxGame
    {
        $userId = Auth::id();
        $slug = $data['slug'] ?? Str::slug($data['name']);

        return AdxGame::query()->create([
            'name' => $data['name'],
            'slug' => $slug,
            'thumbnail' => $data['thumbnail'] ?? null,
            'description' => $data['description'] ?? null,
            'game_url' => $data['game_url'] ?? null,
            'status' => $data['status'] ?? 'active',
            'sort_order' => $data['sort_order'] ?? 0,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }
}

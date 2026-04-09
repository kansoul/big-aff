<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use Illuminate\Support\Facades\Auth;

class CreateKeywordSetAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): KeywordSet
    {
        $userId = Auth::id();

        return KeywordSet::query()->create([
            'name' => $data['name'],
            'keywords' => $data['keywords'] ?? null,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }
}

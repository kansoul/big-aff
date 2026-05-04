<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use App\Support\OwnerResource\KeywordSetResource;
use Illuminate\Support\Facades\Auth;

class UpdateKeywordSetAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(KeywordSet $keywordSet, array $data): KeywordSet
    {
        (new KeywordSetResource)->authorize($keywordSet);

        $keywordSet->update([
            'name' => $data['name'] ?? $keywordSet->name,
            'keywords' => array_key_exists('keywords', $data) ? $data['keywords'] : $keywordSet->keywords,
            'updated_by' => Auth::id(),
        ]);

        return $keywordSet->fresh();
    }
}

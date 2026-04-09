<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;

class UpdateKeywordSetAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(KeywordSet $keywordSet, array $data): KeywordSet
    {
        OwnershipFilter::forAuthUser()->authorize($keywordSet->created_by);

        $keywordSet->update([
            'name' => $data['name'] ?? $keywordSet->name,
            'keywords' => array_key_exists('keywords', $data) ? $data['keywords'] : $keywordSet->keywords,
            'updated_by' => Auth::id(),
        ]);

        return $keywordSet->fresh();
    }
}

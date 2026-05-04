<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use App\Support\OwnerResource\KeywordSetResource;

class DeleteKeywordSetAction
{
    public function execute(KeywordSet $keywordSet): void
    {
        (new KeywordSetResource)->authorize($keywordSet);

        $keywordSet->delete();
    }
}

<?php

namespace App\Actions\KeywordSet;

use App\Models\KeywordSet;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteKeywordSetAction
{
    public function execute(KeywordSet $keywordSet): void
    {
        OwnershipFilter::forAuthUser()->authorize($keywordSet->created_by);

        $keywordSet->delete();
    }
}

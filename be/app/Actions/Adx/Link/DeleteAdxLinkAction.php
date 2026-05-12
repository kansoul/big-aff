<?php

namespace App\Actions\Adx\Link;

use App\Models\AdxLink;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteAdxLinkAction
{
    public function execute(AdxLink $link): void
    {
        OwnershipFilter::forAuthUser()->authorize($link->created_by);

        $link->delete();
    }
}

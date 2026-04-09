<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteChannelAction
{
    public function execute(Channel $channel): void
    {
        OwnershipFilter::forAuthUser()->authorize($channel->created_by);

        $channel->delete();
    }
}

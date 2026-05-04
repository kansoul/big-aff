<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Support\OwnerResource\ChannelOwnerResource;

class DeleteChannelAction
{
    public function execute(Channel $channel): void
    {
        (new ChannelOwnerResource)->authorize($channel);

        $channel->delete();
    }
}

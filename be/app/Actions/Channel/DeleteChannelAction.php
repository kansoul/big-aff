<?php

namespace App\Actions\Channel;

use App\Models\Channel;

class DeleteChannelAction
{
    public function execute(Channel $channel): void
    {
        $channel->delete();
    }
}

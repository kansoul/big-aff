<?php

namespace App\Actions\Follow;

use App\Models\Follow;

class UnsubscribeFollowAction
{
    public function execute(array $data): void
    {
        if (empty($data['site_id'])) {
            return;
        }
        Follow::where('site_id', $data['site_id'])
            ->where('email', $data['email'])
            ->delete();
    }
}

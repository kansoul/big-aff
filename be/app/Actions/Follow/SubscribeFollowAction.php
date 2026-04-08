<?php

namespace App\Actions\Follow;

use App\Models\Follow;

class SubscribeFollowAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Follow
    {
        return Follow::updateOrCreate(
            [
                'site_id' => $data['site_id'],
                'email' => $data['email'],
            ],
            [
                'post_id' => $data['post_id'] ?? null,
                'ads_link_id' => $data['ads_link_id'] ?? null,
                'style_code' => $data['style_code'] ?? null,
                'channel_code' => $data['channel_code'] ?? null,
            ]
        );
    }
}

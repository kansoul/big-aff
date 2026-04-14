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
                'email' => $data['email'],
            ],
            [
                'post_id' => $data['post_id'] ?? null,
                'style_code' => $data['style'] ?? null,
                'channel_code' => $data['channel'] ?? null,
            ]
        );
    }
}

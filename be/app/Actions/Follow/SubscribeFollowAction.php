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
                'style_code' => $data['style'] ?? null,
            ]
        );
    }
}

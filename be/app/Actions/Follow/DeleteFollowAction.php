<?php

namespace App\Actions\Follow;

use App\Models\Follow;

class DeleteFollowAction
{
    public function execute(Follow $follow): void
    {
        $follow->delete();
    }
}

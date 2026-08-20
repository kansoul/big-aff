<?php

namespace App\Actions\Link;

use App\Enums\LinkStatus;
use App\Models\Link;
use Illuminate\Support\Str;

class CreateLinkAction
{
    public function execute(array $data): Link
    {
        return Link::query()->create([
            ...$data,
            'tracking_code' => Str::random(32),
            'status' => $data['status'] ?? LinkStatus::ACTIVE->value,
        ]);
    }
}

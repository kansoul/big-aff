<?php

namespace App\Actions\Site;

use App\Enums\SiteStatus;
use App\Models\Site;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CreateSiteAction
{
    public function execute(array $data): Site
    {
        $userId = Auth::id();

        return Site::query()->create([
            'name' => $data['name'],
            'url' => $data['url'],
            'secret_key' => Str::random(40),
            'logo_id' => $data['logo_id'] ?? null,
            'favicon_id' => $data['favicon_id'] ?? null,
            'settings' => $data['settings'] ?? null,
            'description' => $data['description'] ?? null,
            'status' => SiteStatus::Active->value,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }
}

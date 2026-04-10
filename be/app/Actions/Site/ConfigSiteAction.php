<?php

namespace App\Actions\Site;

use App\Models\Site;

class ConfigSiteAction
{
    public function execute(string $domain): ?Site
    {
        return Site::where('url', 'https://'.$domain)
            ->with(['logo:id,path', 'favicon:id,path'])
            ->where('status', 'active')
            ->first();
    }
}

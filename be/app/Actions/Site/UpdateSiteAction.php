<?php

namespace App\Actions\Site;

use App\Models\Site;
use App\Support\OwnerResource\SiteOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class UpdateSiteAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Site $site, array $data): Site
    {
        (new SiteOwnerResource)->authorize($site);

        $updateData = collect($data)
            ->merge(['updated_by' => Auth::id()])
            ->all();

        $site->update($updateData);

        return $site->fresh(['logo', 'favicon']) ?? $site;
    }
}

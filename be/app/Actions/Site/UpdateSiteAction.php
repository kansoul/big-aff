<?php

namespace App\Actions\Site;

use App\Models\Site;
use App\Support\OwnershipFilter\OwnershipFilter;
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
        OwnershipFilter::forAuthUser()->authorize($site->created_by);

        $updateData = collect($data)
            ->merge(['updated_by' => Auth::id()])
            ->all();

        $site->update($updateData);

        return $site->fresh(['logo', 'favicon']) ?? $site;
    }
}

<?php

namespace App\Actions\Site;

use App\Models\Site;
use Illuminate\Support\Facades\Auth;

class UpdateSiteAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Site $site, array $data): Site
    {
        $updateData = collect($data)
            ->merge(['updated_by' => Auth::id()])
            ->all();

        $site->update($updateData);

        return $site->fresh(['logo', 'favicon']) ?? $site;
    }
}

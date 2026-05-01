<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\AdsLink;
use App\Models\User;

class AdsLinkPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::AdsLinksView);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::AdsLinksCreate);
    }

    public function update(User $user, AdsLink $adsLink): bool
    {
        if (! $user->hasPermissionFlag(Permission::AdsLinksUpdate)) {
            return false;
        }

        return $user->is_admin || $adsLink->created_by === $user->id;
    }

    public function toggleHide(User $user, AdsLink $adsLink): bool
    {
        return $adsLink->created_by === $user->id;
    }
}

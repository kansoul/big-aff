<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\KeywordSet;
use App\Models\User;

class KeywordSetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::KeywordSetsView);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::KeywordSetsCreate);
    }

    public function update(User $user, KeywordSet $keywordSet): bool
    {
        if (! $user->hasPermissionFlag(Permission::KeywordSetsUpdate)) {
            return false;
        }

        return $keywordSet->created_by === $user->id;
    }

    public function delete(User $user, KeywordSet $keywordSet): bool
    {
        if (! $user->hasPermissionFlag(Permission::KeywordSetsDelete)) {
            return false;
        }

        return $keywordSet->created_by === $user->id;
    }
}

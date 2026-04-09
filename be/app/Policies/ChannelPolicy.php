<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Channel;
use App\Models\User;

class ChannelPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::ChannelsView);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionFlag(Permission::ChannelsCreate);
    }

    public function delete(User $user, Channel $channel): bool
    {
        return $user->hasPermissionFlag(Permission::ChannelsDelete);
    }
}

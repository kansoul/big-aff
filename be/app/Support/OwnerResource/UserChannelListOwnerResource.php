<?php

namespace App\Support\OwnerResource;

use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

/**
 * Variant for listing users in the channel context:
 * includes users in the allowed hierarchy OR users directly created by the auth user.
 */
final class UserChannelListOwnerResource extends OwnerResource
{
    protected function scope(Builder $query, array $allowedIds): void
    {
        $authId = Auth::id();

        $query->where(function (Builder $q) use ($allowedIds, $authId): void {
            $q->whereIn('users.id', $allowedIds)
                ->orWhere('users.created_by', $authId);
        });
    }
}

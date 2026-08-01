<?php

namespace App\Models\Traits\Scope;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait FileScope
{
    public function scopeVisibleToUser(Builder $query, User $user): Builder
    {
        if ($user->isAdmin) {
            return $query;
        }

        $mediaDirectoryPrefix = trim((string) config('filesystems.uploads.directories.media', 'media'), '/');

        return $query->where(function (Builder $directoryQuery) use ($mediaDirectoryPrefix): void {
            $directoryQuery
                ->where('path', $mediaDirectoryPrefix)
                ->orWhere('path', 'like', $mediaDirectoryPrefix.'/%');
        });
    }
}

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

        $postsDirectoryPrefix = trim((string) config('filesystems.uploads.directories.posts', 'media/posts'), '/');

        return $query->where(function (Builder $directoryQuery) use ($postsDirectoryPrefix): void {
            $directoryQuery
                ->where('path', $postsDirectoryPrefix)
                ->orWhere('path', 'like', $postsDirectoryPrefix.'/%');
        });
    }
}

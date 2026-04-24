<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvalidateUserRemoteSessionsAction
{
    /**
     * Revoke Sanctum tokens, database sessions (except one row if given), and
     * rotate remember_token so all "remember me" cookies for this user stop working.
     *
     * @param  ?string  $exceptSessionId  Session id to keep (same browser after self password change).
     */
    public function execute(User $user, ?string $exceptSessionId = null): void
    {
        $user->tokens()->delete();

        $table = (string) config('session.table', 'sessions');

        $query = DB::table($table)->where('user_id', $user->id);

        if ($exceptSessionId !== null && $exceptSessionId !== '') {
            $query->where('id', '!=', $exceptSessionId);
        }

        $query->delete();

        User::query()->whereKey($user->id)->update([
            'remember_token' => Str::random(60),
        ]);
    }
}

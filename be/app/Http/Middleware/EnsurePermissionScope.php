<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermissionScope
{
    /**
     * Grant access if the user has any of the permission cases (pipe-separated enum names) or full access (`*`).
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $permissions): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        $user->loadMissing('role');
        $mask = (int) ($user->role?->permission_mask ?? 0);

        $candidates = array_map('trim', explode('|', $permissions));
        $candidates = array_values(array_filter($candidates, fn (string $s): bool => $s !== ''));

        foreach ($candidates as $token) {
            if ($token === '*' && Permission::maskHasFullAccess($mask)) {
                return $next($request);
            }

            $perm = Permission::tryFromName($token);
            if ($perm !== null && $user->hasPermissionFlag($perm)) {
                return $next($request);
            }
        }

        abort(Response::HTTP_FORBIDDEN, 'Forbidden.');
    }
}

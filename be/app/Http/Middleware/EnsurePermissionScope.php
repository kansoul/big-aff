<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermissionScope
{
    /**
     * Grant access if the user has any of the required permission bits (pipe-separated integers matching `Permission` case values), or full access (all bits set on the role mask).
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

        if (! Permission::maskAllowsAnyOf($mask, $permissions)) {
            abort(Response::HTTP_FORBIDDEN, 'Forbidden.');
        }

        return $next($request);
    }
}

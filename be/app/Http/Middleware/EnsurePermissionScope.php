<?php

namespace App\Http\Middleware;

use App\Enums\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermissionScope
{
    /**
     * Grant access if the user has any of the required permissions (pipe-separated slugs), or full access (all defined permissions on the role).
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $permissions): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        $user->loadMissing('role.rolePermissions');
        $rolePerms = $user->role?->getPermissionSlugs() ?? [];

        if (! Permission::collectionAllowsAnyOf($rolePerms, $permissions)) {
            abort(Response::HTTP_FORBIDDEN, 'Forbidden.');
        }

        return $next($request);
    }
}

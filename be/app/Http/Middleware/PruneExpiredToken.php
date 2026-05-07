<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class PruneExpiredToken
{
    /**
     * Reject requests that carry a Sanctum Bearer token that has passed its expires_at date.
     *
     * Sanctum's Guard already skips expired tokens, but explicit Bearer requests that reach
     * un-authenticated routes (e.g. /switch-account) bypass the Guard entirely.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if ($bearerToken === null) {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($bearerToken);

        if ($accessToken && $accessToken->expires_at?->isPast()) {
            $accessToken->delete();

            return response()->json(['message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}

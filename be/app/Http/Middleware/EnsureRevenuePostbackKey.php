<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRevenuePostbackKey
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $configuredKey = (string) config('revenue.postback_key');
        $providedKey = (string) $request->query('key', '');

        if ($configuredKey === '' || $providedKey === '' || ! hash_equals($configuredKey, $providedKey)) {
            return response()->json(['message' => 'Invalid postback key.'], 401);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckWhitelist
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('whitelist.enabled')) {
            return $next($request);
        }

        $ip = $request->ip();
        $referer = $request->headers->get('referer');
        $host = parse_url($referer ?? '', PHP_URL_HOST);

        if (in_array($ip, config('whitelist.ip'))) {
            return $next($request);
        }

        if ($host && in_array($host, config('whitelist.domain'))) {
            return $next($request);
        }

        return response()->json(['message' => 'Not allowed'], 403);
    }
}

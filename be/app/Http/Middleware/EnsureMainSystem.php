<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMainSystem
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('main_system.is_main')) {
            abort(Response::HTTP_NOT_FOUND);
        }

        return $next($request);
    }
}

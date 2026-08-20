<?php

use App\Http\Middleware\CheckWhitelist;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureAppUser;
use App\Http\Middleware\EnsureMainSystem;
use App\Http\Middleware\EnsurePermissionScope;
use App\Http\Middleware\PruneExpiredToken;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
            PruneExpiredToken::class,
        ]);

        // Public landing-page endpoints: called from the LP with no session, so
        // the stateful Sanctum path must not demand a CSRF token (419).
        $middleware->validateCsrfTokens(except: [
            'api/tracking/*',
        ]);

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'ensure.admin' => EnsureAdmin::class,
            'permission.scope' => EnsurePermissionScope::class,
            'ensure.app.user' => EnsureAppUser::class,
            'ensure.main-system' => EnsureMainSystem::class,
            'check.whitelist' => CheckWhitelist::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (HttpException $e, Request $request) {
            if ($e->getStatusCode() === 419) {
                return response()->json([
                    'message' => 'CSRF token mismatch.',
                ], 419);
            }
        });
    })->create();

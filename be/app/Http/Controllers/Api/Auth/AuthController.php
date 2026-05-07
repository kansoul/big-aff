<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\Auth\AuthStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\User\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Auth
 */
class AuthController extends BaseController
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Login
     *
     * Authenticate a user with email and password. Returns a Sanctum token on success.
     *
     * @unauthenticated
     *
     * @response 200 {"data": {"id": 1, "name": "Admin", "email": "admin@example.com", "permissions": ["settings.users.view"]}}
     * @response 401 {"success": false, "message": "Invalid credentials", "data": null}
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return match ($result['status']) {
            AuthStatus::SUCCESS => $this->sendResponse(
                [
                    'data' => new UserResource($result['user']),
                    'token' => $result['token'],
                ]
            ),
            AuthStatus::INVALID_CREDENTIALS => $this->sendError(
                error: $result['message'],
                code: Response::HTTP_UNAUTHORIZED
            ),
            default => $this->sendError(
                error: $result['message'],
                code: Response::HTTP_INTERNAL_SERVER_ERROR
            ),
        };
    }

    /**
     * Current user
     *
     * Return the authenticated user's profile and permissions.
     *
     * @response 200 {"data": {"id": 1, "name": "Admin", "email": "admin@example.com", "permissions": ["settings.users.view"]}}
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        $user->load('role');

        return $this->sendResponse(
            [
                'data' => new UserResource($user),
            ]
        );
    }

    /**
     * Switch account
     *
     * Validate a stored PAT and update the server session to that user.
     * The response sets a new laravel_session cookie so subsequent
     * cookie-based requests are authenticated as the target user.
     *
     * @unauthenticated
     *
     * @response 200 {"data": {"id": 2, "name": "Leader", "email": "leader@example.com", "permissions": []}}
     * @response 401 {"success": false, "message": "Invalid or expired token.", "data": null}
     */
    public function switch(Request $request): JsonResponse
    {
        $validated = $request->validate(['token' => ['required', 'string']]);

        $result = $this->authService->switchAccount($validated['token']);

        return match ($result['status']) {
            AuthStatus::SUCCESS => $this->sendResponse(
                ['data' => new UserResource($result['user'])]
            ),
            AuthStatus::INVALID_CREDENTIALS => $this->sendError(
                error: $result['message'],
                code: Response::HTTP_UNAUTHORIZED
            ),
            default => $this->sendError(
                error: $result['message'],
                code: Response::HTTP_INTERNAL_SERVER_ERROR
            ),
        };
    }

    /**
     * Logout
     *
     * Revoke the current user's token and end the session.
     *
     * @response 204
     */
    public function logout(): JsonResponse
    {
        $result = $this->authService->logout();

        if ($result['status'] === AuthStatus::LOGGED_OUT) {
            return $this->sendResponse([], Response::HTTP_NO_CONTENT);
        }

        return $this->sendError($result['message'], [], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

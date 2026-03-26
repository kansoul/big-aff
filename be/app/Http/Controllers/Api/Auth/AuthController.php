<?php

namespace App\Http\Controllers\Api\Auth;

use App\Enums\Auth\AuthStatus;
use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends BaseController
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return match ($result['status']) {
            AuthStatus::SUCCESS => $this->sendResponse(
                data: new UserResource($result['user']),
                message: 'Login successful'
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

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        return $this->sendResponse(
            data: new UserResource($user),
            message: 'User retrieved successfully'
        );
    }

    public function logout(): JsonResponse
    {
        $result = $this->authService->logout();

        if ($result['status'] === AuthStatus::LOGGED_OUT) {
            return $this->sendResponse(null, $result['message']);
        }

        return $this->sendError($result['message'], [], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

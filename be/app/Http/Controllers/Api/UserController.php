<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\ManagedUserResource;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserService $userService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        $this->authorize('viewAny', User::class);

        $users = $this->userService->listForActor($auth);

        return $this->sendResponse(
            ManagedUserResource::collection($users),
            'Users retrieved successfully.'
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return $this->sendResponse(
            new ManagedUserResource($user),
            'User created successfully.',
            Response::HTTP_CREATED
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $updated = $this->userService->update($user, $request->validated());

        return $this->sendResponse(
            new ManagedUserResource($updated),
            'User updated successfully.'
        );
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $this->userService->delete($user);

        return $this->sendResponse(null, 'User deleted successfully.');
    }
}

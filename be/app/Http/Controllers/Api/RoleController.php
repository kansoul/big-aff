<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Services\Role\RoleService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Roles
 */
class RoleController extends BaseController
{
    public function __construct(
        private readonly RoleService $roleService
    ) {}

    /**
     * List roles
     *
     * Return all roles with their decoded permission slugs.
     *
     * @response 200 {"data": [{"id": 1, "name": "Admin", "permissions": ["settings.users.view"], "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}]}
     */
    public function index(): JsonResponse
    {
        $roles = $this->roleService->list();

        return $this->sendResponse(
            [
                'data' => RoleResource::collection($roles),
            ]
        );
    }

    /**
     * Create role
     *
     * Create a new role with optional permission slugs.
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roleService->create($request->validated());

        return $this->sendResponse(
            [
                'data' => new RoleResource($role),
            ]
        );
    }

    /**
     * Update role
     *
     * Update a role's name and/or permissions.
     */
    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $updated = $this->roleService->update($role, $request->validated());

        return $this->sendResponse(
            [
                'data' => new RoleResource($updated),
            ]
        );
    }

    /**
     * Delete role
     *
     * Remove a role from the system.
     */
    public function destroy(Role $role): JsonResponse
    {
        $this->roleService->delete($role);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

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

class RoleController extends BaseController
{
    public function __construct(
        private readonly RoleService $roleService
    ) {}

    public function index(): JsonResponse
    {
        $roles = $this->roleService->list();

        return $this->sendResponse(
            RoleResource::collection($roles),
            'Roles retrieved successfully.'
        );
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roleService->create($request->validated());

        return $this->sendResponse(
            new RoleResource($role),
            'Role created successfully.',
            Response::HTTP_CREATED
        );
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $updated = $this->roleService->update($role, $request->validated());

        return $this->sendResponse(
            new RoleResource($updated),
            'Role updated successfully.'
        );
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->roleService->delete($role);

        return $this->sendResponse(null, 'Role deleted successfully.');
    }
}

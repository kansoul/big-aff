<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class RoleController extends BaseController
{
    public function index(): JsonResponse
    {
        $roles = Role::query()->orderBy('name')->get();

        return $this->sendResponse(
            RoleResource::collection($roles),
            'Roles retrieved successfully.'
        );
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = Role::query()->create($request->validated());

        return $this->sendResponse(
            new RoleResource($role),
            'Role created successfully.',
            Response::HTTP_CREATED
        );
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $data = $request->validated();
        if ($data !== []) {
            $role->update($data);
        }

        return $this->sendResponse(
            new RoleResource($role->fresh()),
            'Role updated successfully.'
        );
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->users()->exists()) {
            return $this->sendError(
                'Cannot delete a role that is still assigned to users.',
                [],
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $role->delete();

        return $this->sendResponse(null, 'Role deleted successfully.');
    }
}

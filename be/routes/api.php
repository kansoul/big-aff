<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\RoleController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('permission.scope:SettingsRolesView');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('permission.scope:SettingsRolesCreate');
    Route::put('roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission.scope:SettingsRolesUpdate|SettingsRolesAssign');
    Route::patch('roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission.scope:SettingsRolesUpdate|SettingsRolesAssign');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])
        ->middleware('permission.scope:SettingsRolesDelete');
});

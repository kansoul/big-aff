<?php

use App\Enums\Permission;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserParentChildController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->middleware('permission.scope:'.Permission::SettingsUsersView->value);
        Route::get('parent-child-assignments', [UserParentChildController::class, 'index'])
            ->middleware('permission.scope:'.Permission::SettingsUsersView->value);
        Route::post('/', [UserController::class, 'store'])
            ->middleware('permission.scope:'.Permission::SettingsUsersCreate->value);
        Route::match(['put', 'patch'], '{user}', [UserController::class, 'update'])
            ->middleware('permission.scope:'.Permission::SettingsUsersUpdate->value);
        Route::put('{user}/parent-children', [UserParentChildController::class, 'update'])
            ->middleware('permission.scope:'.Permission::SettingsUsersUpdate->value);
        Route::delete('{user}', [UserController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::SettingsUsersDelete->value);
    });

    Route::prefix('files')->middleware('ensure.app.user')->group(function () {
        Route::get('/', [FileController::class, 'index']);
        Route::post('/', [FileController::class, 'store']);
        Route::get('{file}', [FileController::class, 'show']);
        Route::delete('{file}', [FileController::class, 'destroy']);
    });

    Route::prefix('sites')->group(function () {
        Route::get('options', [SiteController::class, 'options'])
            ->middleware('permission.scope:'.Permission::SettingsSitesAssign->value);
        Route::get('/', [SiteController::class, 'index'])
            ->middleware('permission.scope:'.Permission::SettingsSitesView->value);
        Route::post('/', [SiteController::class, 'store'])
            ->middleware('permission.scope:'.Permission::SettingsSitesCreate->value);
        Route::get('{site}', [SiteController::class, 'show'])
            ->middleware('permission.scope:'.Permission::SettingsSitesView->value);
        Route::match(['put', 'patch'], '{site}', [SiteController::class, 'update'])
            ->middleware('permission.scope:'.Permission::SettingsSitesUpdate->value);
        Route::delete('{site}', [SiteController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::SettingsSitesDelete->value);
        Route::post('{site}/assign-users', [SiteController::class, 'assignUsers'])
            ->middleware('permission.scope:'.Permission::SettingsSitesAssign->value);
    });

    Route::prefix('roles')->group(function () {
        $listBits = implode('|', [
            (string) Permission::SettingsRolesView->value,
            (string) Permission::SettingsUsersCreate->value,
            (string) Permission::SettingsUsersUpdate->value,
        ]);
        $updateBits = Permission::SettingsRolesUpdate->value
            .'|'
            .Permission::SettingsRolesAssign->value;

        Route::get('/', [RoleController::class, 'index'])
            ->middleware('permission.scope:'.$listBits);
        Route::post('/', [RoleController::class, 'store'])
            ->middleware('permission.scope:'.Permission::SettingsRolesCreate->value);
        Route::match(['put', 'patch'], '{role}', [RoleController::class, 'update'])
            ->middleware('permission.scope:'.$updateBits);
        Route::delete('{role}', [RoleController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::SettingsRolesDelete->value);
    });
});

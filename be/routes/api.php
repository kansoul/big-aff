<?php

use App\Enums\Permission;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdClientController;
use App\Http\Controllers\Api\AdsLinkController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\BusinessCenterController;
use App\Http\Controllers\Api\CampaignRuleSettingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\KeywordSetController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\StyleController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserParentChildController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('check.whitelist')->group(function () {
    Route::prefix('follow')->group(function (): void {
        Route::post('/subscribe', [FollowController::class, 'store']);
        Route::post('/unsubscribe', [FollowController::class, 'unsubscribe']);
    });
    Route::get('/site/config', [SiteController::class, 'config']);
    Route::get('/post/{slug}', [PostController::class, 'getPostBySlug']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('follows')->group(function () {
        Route::get('/', [FollowController::class, 'index'])
            ->middleware('permission.scope:'.Permission::FollowsView->value);
        Route::delete('/{follow}', [FollowController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::FollowsDelete->value);
    });

    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('users')->group(function () {
        Route::get('options', [UserController::class, 'options']);
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
        Route::post('{user}/assign-accounts', [UserController::class, 'assignAccounts'])
            ->middleware('permission.scope:'.Permission::AccountsAssign->value);
    });

    Route::prefix('files')->middleware('ensure.app.user')->group(function () {
        Route::get('/options', [FileController::class, 'options']);
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

    Route::prefix('posts')->group(function () {
        Route::get('options', [PostController::class, 'options'])
            ->middleware('permission.scope:'.Permission::AdsLinksCreate->value.'|'.Permission::AdsLinksView->value);
        Route::get('/', [PostController::class, 'index'])
            ->middleware('permission.scope:'.Permission::PostsView->value);
        Route::post('/', [PostController::class, 'store'])
            ->middleware('permission.scope:'.Permission::PostsCreate->value);
        Route::get('{post}', [PostController::class, 'show'])
            ->middleware('permission.scope:'.Permission::PostsView->value);
        Route::match(['put', 'patch'], '{post}', [PostController::class, 'update'])
            ->middleware('permission.scope:'.Permission::PostsUpdate->value);
        Route::delete('{post}', [PostController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::PostsDelete->value);
    });

    Route::prefix('categories')->group(function () {
        Route::get('/', [CategoryController::class, 'index'])
            ->middleware('permission.scope:'.Permission::CategoriesView->value);
        Route::post('/', [CategoryController::class, 'store'])
            ->middleware('permission.scope:'.Permission::CategoriesCreate->value);
        Route::get('{category}', [CategoryController::class, 'show'])
            ->middleware('permission.scope:'.Permission::CategoriesView->value);
        Route::match(['put', 'patch'], '{category}', [CategoryController::class, 'update'])
            ->middleware('permission.scope:'.Permission::CategoriesUpdate->value);
        Route::delete('{category}', [CategoryController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::CategoriesDelete->value);
    });

    Route::prefix('channels')->group(function () {
        Route::get('options', [ChannelController::class, 'options'])
            ->middleware('permission.scope:'.Permission::ChannelsView->value.'|'.Permission::ChannelsCreate->value);
        Route::get('/', [ChannelController::class, 'index'])
            ->middleware('permission.scope:'.Permission::ChannelsView->value);
        Route::post('/', [ChannelController::class, 'store'])
            ->middleware('permission.scope:'.Permission::ChannelsCreate->value);
        Route::delete('{channel}', [ChannelController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::ChannelsDelete->value);
    });

    Route::prefix('styles')->group(function () {
        Route::get('options', [StyleController::class, 'options'])
            ->middleware('permission.scope:'.Permission::StylesView->value.'|'.Permission::StylesCreate->value);
        Route::get('/', [StyleController::class, 'index'])
            ->middleware('permission.scope:'.Permission::StylesView->value);
        Route::post('/', [StyleController::class, 'store'])
            ->middleware('permission.scope:'.Permission::StylesCreate->value);
        Route::delete('{style}', [StyleController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::StylesDelete->value);
    });

    Route::prefix('ads-links')->group(function () {
        Route::get('/', [AdsLinkController::class, 'index'])
            ->middleware('permission.scope:'.Permission::AdsLinksView->value);
        Route::post('/', [AdsLinkController::class, 'store'])
            ->middleware('permission.scope:'.Permission::AdsLinksCreate->value);
        Route::match(['put', 'patch'], '{ads_link}', [AdsLinkController::class, 'update'])
            ->middleware('permission.scope:'.Permission::AdsLinksUpdate->value);
        Route::post('{ads_link}/toggle-hide', [AdsLinkController::class, 'toggleHide'])
            ->middleware('permission.scope:'.Permission::AdsLinksView->value);
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

    Route::prefix('keyword-sets')->group(function () {
        Route::get('/', [KeywordSetController::class, 'index'])
            ->middleware('permission.scope:'.Permission::KeywordSetsView->value);
        Route::post('/', [KeywordSetController::class, 'store'])
            ->middleware('permission.scope:'.Permission::KeywordSetsCreate->value);
        Route::match(['put', 'patch'], '{keyword_set}', [KeywordSetController::class, 'update'])
            ->middleware('permission.scope:'.Permission::KeywordSetsUpdate->value);
        Route::delete('{keyword_set}', [KeywordSetController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::KeywordSetsDelete->value);
    });

    Route::prefix('business-centers')->group(function () {
        Route::get('options', [BusinessCenterController::class, 'options'])
            ->middleware('permission.scope:'.Permission::BusinessCentersView->value);
        Route::get('/', [BusinessCenterController::class, 'index'])
            ->middleware('permission.scope:'.Permission::BusinessCentersView->value);
        Route::post('/', [BusinessCenterController::class, 'store'])
            ->middleware('permission.scope:'.Permission::BusinessCentersCreate->value);
        Route::get('{businessCenter}', [BusinessCenterController::class, 'show'])
            ->middleware('permission.scope:'.Permission::BusinessCentersView->value);
        Route::match(['put', 'patch'], '{businessCenter}', [BusinessCenterController::class, 'update'])
            ->middleware('permission.scope:'.Permission::BusinessCentersUpdate->value);
        Route::delete('{businessCenter}', [BusinessCenterController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::BusinessCentersDelete->value);
    });

    Route::prefix('accounts')->group(function () {
        Route::get('options', [AccountController::class, 'options'])
            ->middleware('permission.scope:'.Permission::AccountsView->value);
        Route::get('/', [AccountController::class, 'index'])
            ->middleware('permission.scope:'.Permission::AccountsView->value);
        Route::post('/', [AccountController::class, 'store'])
            ->middleware('permission.scope:'.Permission::AccountsCreate->value);
        Route::get('{account}', [AccountController::class, 'show'])
            ->middleware('permission.scope:'.Permission::AccountsView->value);
        Route::match(['put', 'patch'], '{account}', [AccountController::class, 'update'])
            ->middleware('permission.scope:'.Permission::AccountsUpdate->value);
        Route::delete('{account}', [AccountController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::AccountsDelete->value);
    });

    Route::prefix('teams')->group(function () {
        Route::get('options', [TeamController::class, 'options'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::get('/', [TeamController::class, 'index'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::post('/', [TeamController::class, 'store'])
            ->middleware('permission.scope:'.Permission::TeamsCreate->value);
        Route::get('{team}', [TeamController::class, 'show'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::match(['put', 'patch'], '{team}', [TeamController::class, 'update'])
            ->middleware('permission.scope:'.Permission::TeamsUpdate->value);
        Route::delete('{team}', [TeamController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::TeamsDelete->value);
        Route::get('{team}/leaders', [TeamController::class, 'leaders'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::get('{team}/user-options', [TeamController::class, 'userOptions'])
            ->middleware('permission.scope:'.Permission::TeamsAssign->value);
        Route::post('{team}/assign-users', [TeamController::class, 'assignUsers'])
            ->middleware('permission.scope:'.Permission::TeamsAssign->value);
        Route::get('{team}/parent-child-options', [UserParentChildController::class, 'teamMemberOptions'])
            ->middleware('permission.scope:'.Permission::SettingsUsersView->value);
    });

    Route::prefix('ad-clients')->group(function () {
        Route::get('/', [AdClientController::class, 'index'])
            ->middleware('permission.scope:'.Permission::AdClientsView->value);
        Route::post('/', [AdClientController::class, 'store'])
            ->middleware('permission.scope:'.Permission::AdClientsCreate->value);
        Route::get('{ad_client}', [AdClientController::class, 'show'])
            ->middleware('permission.scope:'.Permission::AdClientsView->value);
        Route::match(['put', 'patch'], '{ad_client}', [AdClientController::class, 'update'])
            ->middleware('permission.scope:'.Permission::AdClientsUpdate->value);
        Route::delete('{ad_client}', [AdClientController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::AdClientsDelete->value);
    });

    Route::prefix('campaign-rule-settings')->group(function () {
        Route::get('/', [CampaignRuleSettingController::class, 'index'])
            ->middleware('permission.scope:'.Permission::CampaignRuleSettingsView->value);
        Route::match(['put', 'patch'], '{user}', [CampaignRuleSettingController::class, 'save'])
            ->middleware('permission.scope:'.Permission::CampaignRuleSettingsUpdate->value);
    });
});

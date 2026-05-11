<?php

use App\Enums\Permission;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdClientController;
use App\Http\Controllers\Api\AdsDeliveryEntitiesController;
use App\Http\Controllers\Api\AdsLinkController;
use App\Http\Controllers\Api\AdsReportController;
use App\Http\Controllers\Api\AdxAccountController;
use App\Http\Controllers\Api\AdxAccountConversionController;
use App\Http\Controllers\Api\AdxCampaignController;
use App\Http\Controllers\Api\AdxGameController;
use App\Http\Controllers\Api\AdxLinkController;
use App\Http\Controllers\Api\AdxReportController;
use App\Http\Controllers\Api\AdxTrackingController;
use App\Http\Controllers\Api\AnalyticsTrackingController;
use App\Http\Controllers\Api\AssignController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\BusinessCenterController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CampaignReportController;
use App\Http\Controllers\Api\CampaignRuleController;
use App\Http\Controllers\Api\CampaignRuleSettingController;
use App\Http\Controllers\Api\CampaignScheduleController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\GoogleConversionController;
use App\Http\Controllers\Api\InactiveStyleController;
use App\Http\Controllers\Api\KeywordSetController;
use App\Http\Controllers\Api\LogController;
use App\Http\Controllers\Api\MainSystemSyncController;
use App\Http\Controllers\Api\MainTeamController;
use App\Http\Controllers\Api\OptionController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\RevenueChartReportController;
use App\Http\Controllers\Api\RevenueReportController;
use App\Http\Controllers\Api\RevenueReportRangeController;
use App\Http\Controllers\Api\RevenueStatsController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Controllers\Api\StyleController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserParentChildController;
use App\Http\Controllers\Api\UserTablePreferenceController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/switch', [AuthController::class, 'switch']);

Route::middleware('check.whitelist')->group(function () {
    Route::prefix('follow')->group(function (): void {
        Route::post('/subscribe', [FollowController::class, 'store']);
        Route::post('/unsubscribe', [FollowController::class, 'unsubscribe']);
    });
    Route::get('/site/config', [SiteController::class, 'config']);
    Route::get('/post/{slug}', [PostController::class, 'getPostBySlug']);
    Route::get('/posts/search', [PostController::class, 'searchPosts']);
    Route::get('/posts/latest', [PostController::class, 'getLatestPosts']);
    Route::post('/tracking/log', [TrackingController::class, 'storeLog']);
    Route::post('/tracking/ads-conversion', [TrackingController::class, 'storeAdsConversion']);
    Route::post('/adx/tracking/events', [AdxTrackingController::class, 'storeEvent']);
});

Route::prefix('main-system')->group(function () {
    Route::post('insight-reports', [MainSystemSyncController::class, 'receiveInsightReports']);
    Route::post('channels', [MainSystemSyncController::class, 'receiveChannels']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('main-teams')->middleware(['ensure.admin', 'ensure.main-system'])->group(function () {
        Route::get('/', [MainTeamController::class, 'index']);
        Route::post('/', [MainTeamController::class, 'store']);
        Route::get('{mainTeam}', [MainTeamController::class, 'show']);
        Route::match(['put', 'patch'], '{mainTeam}', [MainTeamController::class, 'update']);
        Route::delete('{mainTeam}', [MainTeamController::class, 'destroy']);
    });

    Route::prefix('follows')->group(function () {
        Route::get('/', [FollowController::class, 'index'])
            ->middleware('permission.scope:'.Permission::FollowsView->value);
        Route::delete('/{follow}', [FollowController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::FollowsDelete->value);
    });

    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);

    Route::prefix('options')->group(function () {
        Route::get('users', [OptionController::class, 'users']);
        Route::get('sites', [OptionController::class, 'sites']);
        Route::get('posts', [OptionController::class, 'posts']);
        Route::get('styles', [OptionController::class, 'styles']);
        Route::get('channels', [OptionController::class, 'channels']);
        Route::get('accounts', [OptionController::class, 'accounts']);
        Route::get('teams', [OptionController::class, 'teams']);
        Route::get('business-centers', [OptionController::class, 'businessCenters']);
        Route::get('ads-report', [OptionController::class, 'adsReport'])
            ->middleware('permission.scope:'.Permission::AdsReportView->value);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index'])
            ->middleware('permission.scope:'.Permission::SettingsUsersView->value);
        Route::get('channel-assignments', [AssignController::class, 'usersWithChannels'])
            ->middleware('permission.scope:'.Permission::ChannelsAssign->value);
        Route::get('post-assignments', [AssignController::class, 'usersWithPosts'])
            ->middleware('permission.scope:'.Permission::PostsAssign->value);
        Route::get('account-assignments', [AssignController::class, 'usersWithAccounts'])
            ->middleware('permission.scope:'.Permission::AccountsAssign->value);
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
        Route::post('{user}/assign-accounts', [AssignController::class, 'assignAccountsToUser'])
            ->middleware('permission.scope:'.Permission::AccountsAssign->value);
        Route::post('{user}/assign-channels', [AssignController::class, 'assignChannelsToUser'])
            ->middleware('permission.scope:'.Permission::ChannelsAssign->value);
        Route::post('{user}/assign-posts', [AssignController::class, 'assignPostsToUser'])
            ->middleware('permission.scope:'.Permission::PostsAssign->value);
        Route::get('{user}/team-options', [UserController::class, 'teamOptions'])
            ->middleware('permission.scope:'.Permission::SettingsUsersView->value);
    });

    Route::prefix('files')->middleware('ensure.app.user')->group(function () {
        Route::get('/options', [FileController::class, 'options'])
            ->middleware('permission.scope:'.Permission::FilesView->value);
        Route::get('/', [FileController::class, 'index'])
            ->middleware('permission.scope:'.Permission::FilesView->value);
        Route::post('/', [FileController::class, 'store']);
        Route::get('{file}', [FileController::class, 'show'])
            ->middleware('permission.scope:'.Permission::FilesView->value);
        Route::delete('{file}', [FileController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::FilesView->value);
    });

    Route::prefix('sites')->group(function () {
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
        Route::post('{site}/assign-users', [AssignController::class, 'assignUsersToSite'])
            ->middleware('permission.scope:'.Permission::SettingsSitesAssign->value);
        Route::get('{site}/user-options', [AssignController::class, 'siteUserOptions'])
            ->middleware('permission.scope:'.Permission::SettingsSitesAssign->value);
    });

    Route::prefix('posts')->group(function () {
        Route::get('/', [PostController::class, 'index'])
            ->middleware('permission.scope:'.Permission::PostsView->value);
        Route::post('/', [PostController::class, 'store'])
            ->middleware('permission.scope:'.Permission::PostsCreate->value);
        Route::get('{post}', [PostController::class, 'show'])
            ->middleware('permission.scope:'.Permission::PostsView->value);
        Route::get('{post}/user-options', [PostController::class, 'userOptions'])
            ->middleware('permission.scope:'.Permission::PostsAssign->value);
        Route::match(['put', 'patch'], '{post}', [PostController::class, 'update'])
            ->middleware('permission.scope:'.Permission::PostsUpdate->value);
        Route::delete('{post}', [PostController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::PostsDelete->value);
        Route::post('{post}/publish', [PostController::class, 'publish'])
            ->middleware('permission.scope:'.Permission::PostsPublish->value);
        Route::post('{post}/toggle-hidden', [PostController::class, 'toggleHidden'])
            ->middleware('permission.scope:'.Permission::PostsUpdate->value);
        Route::post('{post}/assign-users', [PostController::class, 'assignUsers'])
            ->middleware('permission.scope:'.Permission::PostsAssign->value);
    });

    Route::prefix('categories')->group(function () {
        $categoryListBits = implode('|', [
            (string) Permission::CategoriesView->value,
            (string) Permission::PostsCreate->value,
            (string) Permission::PostsUpdate->value,
        ]);
        Route::get('/', [CategoryController::class, 'index'])
            ->middleware('permission.scope:'.$categoryListBits);
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
        Route::get('/', [ChannelController::class, 'index'])
            ->middleware('permission.scope:'.Permission::ChannelsView->value);
        Route::post('/', [ChannelController::class, 'store'])
            ->middleware('permission.scope:'.Permission::ChannelsCreate->value);
        Route::delete('{channel}', [ChannelController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::ChannelsDelete->value);
    });

    Route::prefix('styles')->group(function () {
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

    Route::prefix('adx')->group(function () {
        Route::prefix('accounts')->group(function () {
            Route::get('assign-options', [AdxAccountController::class, 'assignOptions'])
                ->middleware('permission.scope:'.Permission::AdxAccountsAssign->value);
            Route::get('user-assignments', [AdxAccountController::class, 'listUsersWithAccounts'])
                ->middleware('permission.scope:'.Permission::AdxAccountsAssign->value);
            Route::post('users/{user}/assign', [AdxAccountController::class, 'assignToUser'])
                ->middleware('permission.scope:'.Permission::AdxAccountsAssign->value);
            Route::get('/', [AdxAccountController::class, 'index'])
                ->middleware('permission.scope:'.Permission::AdxAccountsView->value);
            Route::post('/', [AdxAccountController::class, 'store'])
                ->middleware('permission.scope:'.Permission::AdxAccountsCreate->value);
            Route::get('{adxAccount}', [AdxAccountController::class, 'show'])
                ->middleware('permission.scope:'.Permission::AdxAccountsView->value);
            Route::match(['put', 'patch'], '{adxAccount}', [AdxAccountController::class, 'update'])
                ->middleware('permission.scope:'.Permission::AdxAccountsUpdate->value);
            Route::delete('{adxAccount}', [AdxAccountController::class, 'destroy'])
                ->middleware('permission.scope:'.Permission::AdxAccountsDelete->value);
        });

        Route::prefix('games')->group(function () {
            Route::get('/', [AdxGameController::class, 'index'])
                ->middleware('permission.scope:'.Permission::AdxGamesView->value);
            Route::post('/', [AdxGameController::class, 'store'])
                ->middleware('permission.scope:'.Permission::AdxGamesCreate->value);
            Route::get('{adxGame}', [AdxGameController::class, 'show'])
                ->middleware('permission.scope:'.Permission::AdxGamesView->value);
            Route::match(['put', 'patch'], '{adxGame}', [AdxGameController::class, 'update'])
                ->middleware('permission.scope:'.Permission::AdxGamesUpdate->value);
            Route::delete('{adxGame}', [AdxGameController::class, 'destroy'])
                ->middleware('permission.scope:'.Permission::AdxGamesDelete->value);
        });

        Route::prefix('links')->group(function () {
            Route::get('/', [AdxLinkController::class, 'index'])
                ->middleware('permission.scope:'.Permission::AdxLinksView->value);
            Route::post('/', [AdxLinkController::class, 'store'])
                ->middleware('permission.scope:'.Permission::AdxLinksCreate->value);
            Route::get('{adxLink}', [AdxLinkController::class, 'show'])
                ->middleware('permission.scope:'.Permission::AdxLinksView->value);
            Route::match(['put', 'patch'], '{adxLink}', [AdxLinkController::class, 'update'])
                ->middleware('permission.scope:'.Permission::AdxLinksUpdate->value);
            Route::delete('{adxLink}', [AdxLinkController::class, 'destroy'])
                ->middleware('permission.scope:'.Permission::AdxLinksDelete->value);
        });

        Route::prefix('campaigns')->group(function () {
            Route::get('/', [AdxCampaignController::class, 'campaigns'])
                ->middleware('permission.scope:'.Permission::AdxCampaignsView->value);
        });

        Route::prefix('account-conversions')->group(function () {
            Route::get('/', [AdxAccountConversionController::class, 'index'])
                ->middleware('permission.scope:'.Permission::AdxAccountConversionsView->value);
            Route::post('/', [AdxAccountConversionController::class, 'store'])
                ->middleware('permission.scope:'.Permission::AdxAccountConversionsCreate->value);
            Route::match(['put', 'patch'], '{adxAccountConversion}', [AdxAccountConversionController::class, 'update'])
                ->middleware('permission.scope:'.Permission::AdxAccountConversionsUpdate->value);
            Route::delete('{adxAccountConversion}', [AdxAccountConversionController::class, 'destroy'])
                ->middleware('permission.scope:'.Permission::AdxAccountConversionsDelete->value);
        });

        Route::prefix('reports')
            ->middleware('permission.scope:'.Permission::AdxReportsView->value)
            ->group(function () {
                Route::get('spend', [AdxReportController::class, 'spend']);
                Route::get('revenue', [AdxReportController::class, 'revenue']);
                Route::get('realtime', [AdxReportController::class, 'realtime']);
                Route::get('conversions', [AdxReportController::class, 'conversions']);
            });

        Route::get('reports/campaigns', [AdxReportController::class, 'campaigns'])
            ->middleware('permission.scope:'.Permission::AdxCampaignReportsView->value);
    });

    Route::prefix('roles')->group(function () {
        $listBits = implode('|', [
            (string) Permission::SettingsRolesView->value,
            (string) Permission::SettingsUsersView->value,
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
        Route::get('/options', [RoleController::class, 'options']);
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
        Route::get('assign-options', [AssignController::class, 'accountAssignOptions'])
            ->middleware('permission.scope:'.Permission::AccountsAssign->value);
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
        Route::get('account-options', [TeamController::class, 'accountOptions']);
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
        Route::get('{team}/members', [TeamController::class, 'members'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::get('{team}/leaders', [TeamController::class, 'leaders'])
            ->middleware('permission.scope:'.Permission::TeamsView->value);
        Route::get('{team}/user-options', [AssignController::class, 'teamUserOptions']);
        Route::post('{team}/assign-users', [AssignController::class, 'assignUsersToTeam'])
            ->middleware('permission.scope:'.Permission::TeamsAssign->value);
        Route::get('{team}/parent-child-options', [UserParentChildController::class, 'teamMemberOptions']);
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

    Route::prefix('campaigns')->group(function () {
        Route::get('selector', [CampaignController::class, 'listCampaignSelectorAction']);
        Route::get('adsets/selector', [CampaignController::class, 'listAdsetSelectorAction']);
        Route::get('ads/selector', [CampaignController::class, 'listAdsSelectorAction']);
    });

    Route::prefix('campaign-reports')->group(function () {
        Route::get('delivery-entities-reports/status-options', [AdsDeliveryEntitiesController::class, 'statusOptions']);
        Route::get('{campaignId}/delivery-entities-reports', [AdsDeliveryEntitiesController::class, 'index'])
            ->middleware('permission.scope:'.Permission::DeliveryEntitiesReportsView->value);
        Route::patch('/adsets/{adsetInsightId}/toggle-status', [AdsDeliveryEntitiesController::class, 'toggleAdsetStatus'])
            ->middleware('permission.scope:'.Permission::DeliveryEntitiesReportsUpdate->value);
        Route::patch('/ads/{adsInsightId}/toggle-status', [AdsDeliveryEntitiesController::class, 'toggleAdStatus'])
            ->middleware('permission.scope:'.Permission::DeliveryEntitiesReportsUpdate->value);
    });

    Route::prefix('campaign-rules')->group(function () {
        Route::get('/', [CampaignRuleController::class, 'index'])
            ->middleware('permission.scope:'.Permission::CampaignRulesView->value);
        Route::post('/', [CampaignRuleController::class, 'store'])
            ->middleware('permission.scope:'.Permission::CampaignRulesCreate->value);
        Route::get('{campaignRule}', [CampaignRuleController::class, 'show'])
            ->middleware('permission.scope:'.Permission::CampaignRulesView->value);
        Route::match(['put', 'patch'], '{campaignRule}', [CampaignRuleController::class, 'update'])
            ->middleware('permission.scope:'.Permission::CampaignRulesUpdate->value);
        Route::delete('{campaignRule}', [CampaignRuleController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::CampaignRulesDelete->value);
    });

    Route::prefix('campaign-rule-settings')->group(function () {
        Route::get('/', [CampaignRuleSettingController::class, 'index'])
            ->middleware('permission.scope:'.Permission::CampaignRuleSettingsView->value);
        Route::match(['put', 'patch'], '{user}', [CampaignRuleSettingController::class, 'save'])
            ->middleware('permission.scope:'.Permission::CampaignRuleSettingsUpdate->value);
    });

    Route::prefix('ads-report')->group(function () {
        Route::get('stats', [AdsReportController::class, 'stats'])
            ->middleware('permission.scope:'.Permission::AdsReportView->value);
    });

    Route::prefix('dashboard')->group(function () {
        Route::get('insight-stats', [DashboardController::class, 'insightStats'])->middleware('permission.scope:'.Permission::DashboardStatView->value);
        Route::get('revenue-table', [DashboardController::class, 'revenueTable'])->middleware('permission.scope:'.Permission::DashboardTeamView->value.'|'.Permission::DashboardUserView->value);
    });

    Route::prefix('revenue-reports')->group(function () {
        Route::get('/', [RevenueReportController::class, 'index'])
            ->middleware('permission.scope:'.Permission::RevenueReportsView->value);
    });

    Route::prefix('campaign-reports')
        ->middleware('permission.scope:'.Permission::CampaignReportsView->value)
        ->group(function () {
            Route::get('filters', [CampaignReportController::class, 'filters']);
            Route::get('/', [CampaignReportController::class, 'index']);
            Route::post('{campaign_id}/toggle-status', [CampaignReportController::class, 'toggleStatus']);
        });

    Route::prefix('revenue-chart-reports')
        ->middleware('permission.scope:'.Permission::RevenueChartReportsView->value)
        ->group(function () {
            Route::get('/', [RevenueChartReportController::class, 'index']);
            Route::get('chart', [RevenueChartReportController::class, 'chart']);
        });

    Route::prefix('revenue-stats')->group(function () {
        Route::get('main-team-options', [RevenueStatsController::class, 'mainTeamOptions']);
        Route::get('team-options', [RevenueStatsController::class, 'teamOptions'])->middleware('permission.scope:'.Permission::DashboardTeamView->value.'|'.Permission::DashboardUserView->value);
        Route::get('user-options', [RevenueStatsController::class, 'userOptions'])->middleware('permission.scope:'.Permission::DashboardTeamView->value.'|'.Permission::DashboardUserView->value);
        Route::get('overview', [RevenueStatsController::class, 'overview'])->middleware('permission.scope:'.Permission::DashboardStatView->value);
        Route::get('by-team', [RevenueStatsController::class, 'byTeam'])->middleware('permission.scope:'.Permission::DashboardTeamView->value);
        Route::get('by-user', [RevenueStatsController::class, 'byUser'])->middleware('permission.scope:'.Permission::DashboardUserView->value);
    });

    Route::prefix('google-conversions')->group(function () {
        Route::get('/', [GoogleConversionController::class, 'index'])
            ->middleware('permission.scope:'.Permission::GoogleConversionsView->value);
        Route::match(['put', 'patch'], '{account}', [GoogleConversionController::class, 'update'])
            ->middleware('permission.scope:'.Permission::GoogleConversionsUpdate->value);
        Route::post('bulk-update', [GoogleConversionController::class, 'bulkUpdate'])
            ->middleware('permission.scope:'.Permission::GoogleConversionsUpdate->value);
        Route::post('bulk-import', [GoogleConversionController::class, 'import'])
            ->middleware('permission.scope:'.Permission::GoogleConversionsCreate->value);
    });

    Route::prefix('analytics-tracking')
        ->middleware('permission.scope:'.Permission::AnalyticsTrackingView->value)
        ->group(function () {
            Route::get('filter-options', [AnalyticsTrackingController::class, 'filterOptions']);
            Route::get('stats', [AnalyticsTrackingController::class, 'stats']);
            Route::get('keywords', [AnalyticsTrackingController::class, 'keywords']);
        });

    // Don't need
    Route::prefix('inactive-styles')->group(function () {
        Route::get('/', [InactiveStyleController::class, 'index'])
            ->middleware('permission.scope:'.Permission::InactiveStylesView->value);
        Route::delete('bulk', [InactiveStyleController::class, 'bulkDestroy'])
            ->middleware('permission.scope:'.Permission::InactiveStylesDelete->value);
        Route::delete('{user}', [InactiveStyleController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::InactiveStylesDelete->value);
    });

    Route::prefix('style-report-range')
        ->middleware('permission.scope:'.Permission::RevenueReportRangeView->value)
        ->group(function () {
            Route::post('query', [RevenueReportRangeController::class, 'query']);
        });

    Route::prefix('user-table-preferences')->group(function () {
        Route::get('{table_name}', [UserTablePreferenceController::class, 'show'])
            ->middleware('permission.scope:'.Permission::UserTablePreferencesView->value);
        Route::match(['put', 'patch'], '{table_name}', [UserTablePreferenceController::class, 'update'])
            ->middleware('permission.scope:'.Permission::UserTablePreferencesUpdate->value);
    });

    Route::prefix('campaign-schedules')->group(function () {
        Route::get('/', [CampaignScheduleController::class, 'index'])
            ->middleware('permission.scope:'.Permission::CampaignSchedulesView->value);
        Route::post('/', [CampaignScheduleController::class, 'store'])
            ->middleware('permission.scope:'.Permission::CampaignSchedulesCreate->value);
        Route::get('{campaignSchedule}', [CampaignScheduleController::class, 'show'])
            ->middleware('permission.scope:'.Permission::CampaignSchedulesView->value);
        Route::match(['put', 'patch'], '{campaignSchedule}', [CampaignScheduleController::class, 'update'])
            ->middleware('permission.scope:'.Permission::CampaignSchedulesUpdate->value);
        Route::delete('{campaignSchedule}', [CampaignScheduleController::class, 'destroy'])
            ->middleware('permission.scope:'.Permission::CampaignSchedulesDelete->value);
    });

    Route::prefix('logs')
        ->middleware(['permission.scope:'.Permission::LogsView->value, 'throttle:120,1'])
        ->group(function () {
            Route::delete('clear', [LogController::class, 'clear']);
            Route::get('files', [LogController::class, 'files']);
            Route::get('tail', [LogController::class, 'tail']);
            Route::get('{id}', [LogController::class, 'show']);
            Route::get('/', [LogController::class, 'index']);
        });
});

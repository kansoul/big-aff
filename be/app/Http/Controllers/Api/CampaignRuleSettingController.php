<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\CampaignRuleSetting\ListCampaignRuleSettingsRequest;
use App\Http\Requests\CampaignRuleSetting\SaveCampaignRuleSettingRequest;
use App\Http\Resources\CampaignRuleSetting\UserCampaignRuleSettingResource;
use App\Models\User;
use App\Services\CampaignRuleSetting\CampaignRuleSettingService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Campaign Rule Settings
 */
class CampaignRuleSettingController extends BaseController
{
    public function __construct(
        private readonly CampaignRuleSettingService $service,
    ) {}

    /**
     * List users with their campaign rule settings
     */
    public function index(ListCampaignRuleSettingsRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => UserCampaignRuleSettingResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Save campaign rule setting for a user (create or update)
     *
     * @urlParam user integer required The user ID. Example: 1
     */
    public function save(SaveCampaignRuleSettingRequest $request, User $user): JsonResponse
    {
        $setting = $this->service->save($user, $request->validated());

        $user->setRelation('campaignRuleSetting', $setting);

        return $this->sendResponse([
            'data' => new UserCampaignRuleSettingResource($user),
        ]);
    }
}

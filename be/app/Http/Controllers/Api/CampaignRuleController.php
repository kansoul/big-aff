<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CampaignRule\ListCampaignRulesRequest;
use App\Http\Requests\CampaignRule\StoreCampaignRuleRequest;
use App\Http\Requests\CampaignRule\UpdateCampaignRuleRequest;
use App\Http\Resources\CampaignRule\CampaignRuleResource;
use App\Models\CampaignRule;
use App\Services\CampaignRule\CampaignRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * @tags Campaign Rules
 */
class CampaignRuleController extends BaseController
{
    public function __construct(
        private readonly CampaignRuleService $service,
    ) {}

    /**
     * List campaign rules
     *
     * @queryParam page integer Page number. Example: 1
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam order_by string Column to order by. Example: created_at
     * @queryParam order_direction string asc or desc. Example: desc
     * @queryParam keyword string Search by title, code, user name, or user email. Example: rule_abc
     * @queryParam entity_type string Filter by entity type (campaign|ad_adset). Example: campaign
     * @queryParam is_active boolean Filter by active status. Example: true
     */
    public function index(ListCampaignRulesRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => CampaignRuleResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Get a single campaign rule
     *
     * @urlParam campaign_rule integer required The campaign rule ID. Example: 1
     */
    public function show(CampaignRule $campaignRule): JsonResponse
    {
        $campaignRule->load(['user', 'applyRules']);

        return $this->sendResponse([
            'data' => new CampaignRuleResource($campaignRule),
        ]);
    }

    /**
     * Create a campaign rule
     *
     * @bodyParam title string required Rule title. Example: Morning rule
     * @bodyParam entity_type string required campaign or ad_adset. Example: campaign
     * @bodyParam entity_ids string[] Targets for this rule: FB `campaign_id` when entity_type=campaign, or mixed FB `ad_id` / `adset_id` when entity_type=ad_adset (ad checked first, then adset). Example: ["1234567890"]
     * @bodyParam min_roi number Minimum ROI %. Example: 10
     * @bodyParam min_profit number Minimum profit. Example: 50
     * @bodyParam min_revenue number Minimum revenue threshold. Example: 100
     * @bodyParam min_spend number Minimum spend threshold. Example: 20
     * @bodyParam max_cpa number Maximum CPA. Example: 15
     * @bodyParam min_conversion integer Minimum conversions. Example: 5
     * @bodyParam min_spend_adset number Minimum adset spend. Example: 10
     * @bodyParam start_hour string Time window start HH:MM. Example: 08:00
     * @bodyParam end_hour string Time window end HH:MM. Example: 22:00
     * @bodyParam expired_at string Expiration date. Example: 2026-12-31
     */
    public function store(StoreCampaignRuleRequest $request): JsonResponse
    {
        $rule = $this->service->create($request->validated());

        return $this->sendResponse(
            ['data' => new CampaignRuleResource($rule)],
            Response::HTTP_CREATED,
        );
    }

    /**
     * Update a campaign rule
     *
     * @urlParam campaign_rule integer required The campaign rule ID. Example: 1
     */
    public function update(UpdateCampaignRuleRequest $request, CampaignRule $campaignRule): JsonResponse
    {
        $rule = $this->service->update($campaignRule, $request->validated());

        return $this->sendResponse([
            'data' => new CampaignRuleResource($rule),
        ]);
    }

    /**
     * Delete a campaign rule
     *
     * @urlParam campaign_rule integer required The campaign rule ID. Example: 1
     */
    public function destroy(CampaignRule $campaignRule): JsonResponse
    {
        $this->service->delete($campaignRule);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

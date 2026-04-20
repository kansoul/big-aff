<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\BusinessCenter\ListBusinessCentersRequest;
use App\Http\Requests\BusinessCenter\StoreBusinessCenterRequest;
use App\Http\Requests\BusinessCenter\UpdateBusinessCenterRequest;
use App\Http\Resources\BusinessCenterResource;
use App\Models\BusinessCenter;
use App\Services\BusinessCenter\BusinessCenterService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Business Centers
 */
class BusinessCenterController extends BaseController
{
    public function __construct(
        private readonly BusinessCenterService $businessCenterService
    ) {}

    /**
     * List business centers
     *
     * Return paginated list of business centers.
     *
     * @queryParam query string Search by name or bc_id. Example: my-bc
     * @queryParam order_by string Column to sort by. Enum: id, name. Example: name
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "bc_id": "123", "name": "My BC", "ads_type": "facebook", "team_id": null, "team": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListBusinessCentersRequest $request): JsonResponse
    {
        $paginator = $this->businessCenterService->list($request->validated());

        return $this->sendResponse([
            'data' => BusinessCenterResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create business center
     *
     * Create a new business center.
     *
     * @bodyParam bc_id string optional External BC ID. Example: 123456
     * @bodyParam name string required Business center name (max 255). Example: My Business Center
     * @bodyParam ads_type string required Ads platform type. Enum: facebook, google. Example: facebook
     * @bodyParam team_id integer optional Team ID. Example: 1
     *
     * @response 201 {"data": {"id": 1, "bc_id": "123456", "name": "My Business Center", "ads_type": "facebook", "team_id": null, "team": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The name field is required.", "errors": {"name": ["The name field is required."]}}
     */
    public function store(StoreBusinessCenterRequest $request): JsonResponse
    {
        $businessCenter = $this->businessCenterService->create($request->validated());
        $businessCenter->load(['team']);

        return $this->sendResponse(
            ['data' => new BusinessCenterResource($businessCenter)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show business center
     *
     * Return a single business center by ID.
     *
     * @urlParam businessCenter integer required The business center ID. Example: 1
     *
     * @response 200 {"data": {"id": 1, "bc_id": "123456", "name": "My Business Center", "ads_type": "facebook", "team_id": null, "team": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\BusinessCenter] 1"}
     */
    public function show(BusinessCenter $businessCenter): JsonResponse
    {
        $businessCenter->load(['team']);

        return $this->sendResponse(
            ['data' => new BusinessCenterResource($businessCenter)]
        );
    }

    /**
     * Update business center
     *
     * Update an existing business center (partial update supported).
     *
     * @urlParam businessCenter integer required The business center ID. Example: 1
     *
     * @bodyParam bc_id string optional External BC ID. Pass null to remove. Example: 123456
     * @bodyParam name string optional Business center name (max 255). Example: Updated BC
     * @bodyParam ads_type string optional Ads platform type. Enum: facebook, google. Example: google
     * @bodyParam team_id integer optional Team ID. Pass null to remove. Example: 1
     *
     * @response 200 {"data": {"id": 1, "bc_id": "123456", "name": "Updated BC", "ads_type": "google", "team_id": null, "team": null, "created_by": 1, "updated_by": 2, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-06-01T00:00:00+00:00"}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\BusinessCenter] 1"}
     */
    public function update(UpdateBusinessCenterRequest $request, BusinessCenter $businessCenter): JsonResponse
    {
        $updated = $this->businessCenterService->update($businessCenter, $request->validated());

        return $this->sendResponse(
            ['data' => new BusinessCenterResource($updated)]
        );
    }

    /**
     * Delete business center
     *
     * Soft-delete a business center.
     *
     * @urlParam businessCenter integer required The business center ID. Example: 1
     *
     * @response 204 {}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\BusinessCenter] 1"}
     */
    public function destroy(BusinessCenter $businessCenter): JsonResponse
    {
        $this->businessCenterService->delete($businessCenter);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Business center options
     *
     * Return a flat list of business centers for use in select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "My Business Center"}]}
     */
    public function options(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->businessCenterService->options()]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Follow\ListFollowsRequest;
use App\Http\Requests\Follow\StoreFollowRequest;
use App\Http\Resources\FollowResource;
use App\Services\Follow\FollowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * @tags Follow
 */
class FollowController extends BaseController
{
    public function __construct(
        private readonly FollowService $followService,
    ) {}

    /**
     * List follows
     *
     * Return paginated list of follows.
     *
     * @queryParam query string Search by email. Example: user@example.com
     * @queryParam site_id integer Filter by site. Example: 1
     * @queryParam post_id integer Filter by post. Example: 1
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "email": "user@example.com", "site_id": 1, "post_id": null, "ads_link_id": null, "style_code": null, "channel_code": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListFollowsRequest $request): JsonResponse
    {
        $paginator = $this->followService->list($request->validated());

        return $this->sendResponse([
            'data' => FollowResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Subscribe
     *
     * Subscribe an email to a site.
     *
     * @bodyParam email string required Email address to subscribe. Example: user@example.com
     * @bodyParam site_id integer required Site ID to subscribe to. Example: 1
     * @bodyParam post_id integer optional ID of the post the user came from. Example: 1
     * @bodyParam ads_link_id integer optional ID of the ads link the user came from. Example: 1
     * @bodyParam style_code string optional Style code snapshot. Example: style-a
     * @bodyParam channel_code string optional Channel code snapshot. Example: facebook
     *
     * @response 200 {"data": {"id": 1, "email": "user@example.com", "site_id": 1, "post_id": null, "ads_link_id": null, "style_code": null, "channel_code": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The email field is required.", "errors": {"email": ["The email field is required."]}}
     */
    public function store(StoreFollowRequest $request): JsonResponse
    {
        try {
            $follow = $this->followService->subscribe($request->validated());

            return $this->sendResponse(['data' => new FollowResource($follow)]);
        } catch (\Throwable $e) {
            Log::error('Failed to store subscription', ['error' => $e->getMessage()]);

            return $this->sendError('Failed to subscribe', [], 500);
        }
    }

    /**
     * Unsubscribe
     *
     * Unsubscribe an email from a site. Always returns 200.
     *
     * @bodyParam email string required Email address to unsubscribe. Example: user@example.com
     * @bodyParam site_id integer required Site ID to unsubscribe from. Example: 1
     *
     * @response 200 {"data": []}
     */
    public function unsubscribe(StoreFollowRequest $request): JsonResponse
    {
        try {
            $data = $request->validated();

            if (! empty($data['email'])) {
                $this->followService->unsubscribe($data);
            }

            return $this->sendResponse([]);
        } catch (\Throwable $e) {
            Log::error('Failed to unsubscribe', ['error' => $e->getMessage()]);

            return $this->sendError('Failed to unsubscribe', [], 500);
        }
    }
}

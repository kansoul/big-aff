<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\AdClient\ListAdClientsRequest;
use App\Http\Requests\AdClient\StoreAdClientRequest;
use App\Http\Requests\AdClient\UpdateAdClientRequest;
use App\Http\Resources\AdClientResource;
use App\Models\AdClient;
use App\Services\AdClient\AdClientService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Ad Clients
 */
class AdClientController extends BaseController
{
    public function __construct(
        private readonly AdClientService $adClientService,
    ) {}

    /**
     * List ad clients
     *
     * Return paginated list of ad clients.
     *
     * @queryParam query string Search by ad_client_id, product_code or product_name. Example: ca-pub
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     * @queryParam order_by string Column to sort by. Example: created_at
     * @queryParam order string Sort direction (asc, desc). Example: desc
     */
    public function index(ListAdClientsRequest $request): JsonResponse
    {
        $paginator = $this->adClientService->list($request->validated());

        return $this->sendResponse([
            'data' => AdClientResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create ad client
     *
     * Create a new ad client.
     *
     * @bodyParam ad_client_id string required Unique ad client ID. Example: ca-pub-123456
     * @bodyParam product_code string optional Product code. Example: PROD-001
     * @bodyParam product_name string optional Product name. Example: My Product
     */
    public function store(StoreAdClientRequest $request): JsonResponse
    {
        $adClient = $this->adClientService->create($request->validated());

        return $this->sendResponse(
            ['data' => new AdClientResource($adClient)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show ad client
     *
     * Return a single ad client by ID.
     *
     * @urlParam ad_client integer required The ad client ID. Example: 1
     */
    public function show(AdClient $adClient): JsonResponse
    {
        return $this->sendResponse(
            ['data' => new AdClientResource($adClient)]
        );
    }

    /**
     * Update ad client
     *
     * Update an existing ad client (partial update supported).
     *
     * @urlParam ad_client integer required The ad client ID. Example: 1
     *
     * @bodyParam ad_client_id string optional Unique ad client ID. Example: ca-pub-123456
     * @bodyParam product_code string optional Product code. Example: PROD-001
     * @bodyParam product_name string optional Product name. Example: Updated Product
     */
    public function update(UpdateAdClientRequest $request, AdClient $adClient): JsonResponse
    {
        $updated = $this->adClientService->update($adClient, $request->validated());

        return $this->sendResponse(
            ['data' => new AdClientResource($updated)]
        );
    }

    /**
     * Delete ad client
     *
     * Soft-delete an ad client.
     *
     * @urlParam ad_client integer required The ad client ID. Example: 1
     */
    public function destroy(AdClient $adClient): JsonResponse
    {
        $this->adClientService->delete($adClient);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

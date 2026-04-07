<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Site\AssignSiteRequest;
use App\Http\Requests\Site\ListSitesRequest;
use App\Http\Requests\Site\StoreSiteRequest;
use App\Http\Requests\Site\UpdateSiteRequest;
use App\Http\Resources\SiteResource;
use App\Models\Site;
use App\Services\Site\SiteService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Sites
 */
class SiteController extends BaseController
{
    public function __construct(
        private readonly SiteService $siteService
    ) {}

    /**
     * List sites
     *
     * Return paginated list of sites.
     *
     * @queryParam keyword string Search keyword (name or url). Example: example
     * @queryParam status string Filter by status. Enum: active, maintenance, suspended. Example: active
     *
     * @response 200 {"data": [{"id": 1, "name": "Example Site", "url": "https://example.com", "description": "A site", "status": "active", "settings": {"gtm": null, "fb_pixel": null, "theme_name": null}, "logo": null, "favicon": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListSitesRequest $request): JsonResponse
    {
        $paginator = $this->siteService->list($request->validated());

        return $this->sendResponse([
            'data' => SiteResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create site
     *
     * Create a new site. Optionally upload logo and favicon files.
     *
     * @bodyParam name string required Site name. Example: My Site
     * @bodyParam url string required Site URL (must be unique). Example: https://mysite.com
     * @bodyParam description string optional Description. Example: A description
     * @bodyParam status string optional Site status. Enum: active, maintenance, suspended. Example: active
     * @bodyParam settings object optional Site settings object.
     * @bodyParam settings.gtm string optional Google Tag Manager ID. Example: GTM-XXXXXX
     * @bodyParam settings.fb_pixel string optional Facebook Pixel ID. Example: 123456789
     * @bodyParam settings.theme string optional Theme name. Example: theme-1
     * @bodyParam logo file optional Logo image (max 5MB).
     * @bodyParam favicon file optional Favicon image (max 1MB).
     *
     * @response 201 {"data": {"id": 1, "name": "My Site", "url": "https://mysite.com", "description": "A description", "status": "active", "settings": {"gtm": null, "fb_pixel": null, "theme_name": null}, "logo": null, "favicon": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The name field is required.", "errors": {"name": ["The name field is required."]}}
     */
    public function store(StoreSiteRequest $request): JsonResponse
    {
        $site = $this->siteService->create($request->validated());
        $site->load(['logo', 'favicon']);

        return $this->sendResponse(
            ['data' => new SiteResource($site)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show site
     *
     * Return a single site by ID.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @response 200 {"data": {"id": 1, "name": "My Site", "url": "https://mysite.com", "description": "A description", "status": "active", "settings": {}, "logo": null, "favicon": null, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Site] 1"}
     */
    public function show(Site $site): JsonResponse
    {
        $site->load(['logo', 'favicon']);

        return $this->sendResponse(
            ['data' => new SiteResource($site)]
        );
    }

    /**
     * Update site
     *
     * Update an existing site (partial update supported). Optionally replace logo or favicon.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @bodyParam name string optional Site name. Example: Updated Site
     * @bodyParam url string optional Site URL (must be unique). Example: https://updated.com
     * @bodyParam description string optional Description. Example: Updated description
     * @bodyParam status string optional Site status. Enum: active, maintenance, suspended. Example: active
     * @bodyParam settings object optional Site settings object.
     * @bodyParam settings.gtm string optional Google Tag Manager ID. Example: GTM-XXXXXX
     * @bodyParam settings.fb_pixel string optional Facebook Pixel ID. Example: 123456789
     * @bodyParam settings.theme string optional Theme name. Example: theme-1
     * @bodyParam logo file optional Replacement logo image (max 5MB).
     * @bodyParam favicon file optional Replacement favicon image (max 1MB).
     *
     * @response 200 {"data": {"id": 1, "name": "Updated Site", "url": "https://updated.com", "description": "Updated description", "status": "maintenance", "settings": {}, "logo": null, "favicon": null, "created_by": 1, "updated_by": 2, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Site] 1"}
     * @response 422 {"message": "The url has already been taken.", "errors": {"url": ["The url has already been taken."]}}
     */
    public function update(UpdateSiteRequest $request, Site $site): JsonResponse
    {
        $updated = $this->siteService->update($site, $request->validated());

        return $this->sendResponse(
            ['data' => new SiteResource($updated)]
        );
    }

    /**
     * Delete site
     *
     * Soft-delete a site.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @response 204 {}
     * @response 404 {"message": "No query results for model [App\\Models\\Site] 1"}
     */
    public function destroy(Site $site): JsonResponse
    {
        $this->siteService->delete($site);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Site options
     *
     * Return a flat list of active sites for use in select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "My Site"}]}
     */
    public function options(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->siteService->options()]);
    }

    /**
     * Assign users to site
     *
     * Assign one or more users to a site.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @bodyParam user_ids integer[] required Array of user IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"message": "Users assigned successfully."}
     * @response 404 {"message": "No query results for model [App\\Models\\Site] 1"}
     * @response 422 {"message": "The user_ids field is required.", "errors": {"user_ids": ["The user_ids field is required."]}}
     */
    public function assignUsers(AssignSiteRequest $request, Site $site): JsonResponse
    {
        $this->siteService->assign($site, $request->validated()['user_ids']);

        return $this->sendResponse(['message' => 'Users assigned successfully.']);
    }
}

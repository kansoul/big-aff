<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\UserTablePreference\UpdateUserTablePreferenceRequest;
use App\Http\Resources\UserTablePreferenceResource;
use App\Services\UserTablePreference\UserTablePreferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @tags User Table Preferences
 */
class UserTablePreferenceController extends BaseController
{
    public function __construct(
        private readonly UserTablePreferenceService $userTablePreferenceService,
    ) {}

    /**
     * Get user table preference
     *
     * Return the saved column toggles and additional settings (e.g. filters) for the given table.
     *
     * @urlParam table_name string required Table identifier (e.g. style-report-range). Example: style-report-range
     *
     * @response 200 {"data": {"id": 1, "table_name": "style-report-range", "toggled_columns": [], "additional_settings": {"filters": {}}, "updated_at": "2026-04-18T00:00:00+00:00"}}
     */
    public function show(Request $request, string $tableName): JsonResponse
    {
        $preference = $this->userTablePreferenceService->get(
            $request->user()->id,
            $tableName,
        );

        return $this->sendResponse(['data' => new UserTablePreferenceResource($preference)]);
    }

    /**
     * Update user table preference
     *
     * Save column toggles and/or additional settings for the given table.
     * `additional_settings` is shallow-merged with existing values.
     *
     * @urlParam table_name string required Table identifier. Example: style-report-range
     *
     * @bodyParam toggled_columns string[] Optional list of hidden column keys. Example: ["revenue_start","cpc"]
     * @bodyParam additional_settings object Optional key/value settings to merge (e.g. filters). Example: {"filters": {"ranges_filter": {}}}
     *
     * @response 200 {"data": {"id": 1, "table_name": "style-report-range", "toggled_columns": ["cpc"], "additional_settings": {"filters": {}}, "updated_at": "2026-04-18T00:00:00+00:00"}}
     */
    public function update(UpdateUserTablePreferenceRequest $request, string $tableName): JsonResponse
    {
        $preference = $this->userTablePreferenceService->update(
            $request->user()->id,
            $tableName,
            $request->validated(),
        );

        return $this->sendResponse(['data' => new UserTablePreferenceResource($preference)]);
    }
}

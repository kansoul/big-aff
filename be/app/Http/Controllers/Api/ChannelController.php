<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\Channel\BulkStoreChannelRequest;
use App\Http\Requests\Channel\ListChannelsRequest;
use App\Http\Resources\ChannelResource;
use App\Models\Channel;
use App\Services\Channel\ChannelService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Channels
 */
class ChannelController extends BaseController
{
    public function __construct(
        private readonly ChannelService $channelService
    ) {}

    /**
     * List channels
     */
    public function index(ListChannelsRequest $request): JsonResponse
    {
        $paginator = $this->channelService->list($request->validated(), $request->user());

        return $this->sendResponse([
            'data' => ChannelResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Bulk create channels
     */
    public function store(BulkStoreChannelRequest $request): JsonResponse
    {
        $result = $this->channelService->bulkCreate($request->validated());

        return $this->sendResponse(
            [
                'data' => ChannelResource::collection($result['created']),
                'errors' => $result['errors'],
            ],
            Response::HTTP_CREATED
        );
    }

    /**
     * Delete a channel
     */
    public function destroy(Channel $channel): JsonResponse
    {
        $this->authorize('delete', $channel);

        $this->channelService->delete($channel);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Channel options for select inputs
     */
    public function options(): JsonResponse
    {
        $channels = Channel::query()
            ->select(['id', 'code', 'name'])
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        return $this->sendResponse([
            'data' => $channels->map(fn(Channel $channel) => [
                'code' => $channel->code,
                'name' => $channel->name,
            ]),
        ]);
    }
}

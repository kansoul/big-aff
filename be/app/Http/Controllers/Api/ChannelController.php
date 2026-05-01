<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Channel\AssignChannelRequest;
use App\Http\Requests\Channel\BulkStoreChannelRequest;
use App\Http\Requests\Channel\ListChannelsRequest;
use App\Http\Requests\Channel\ListUsersWithChannelsRequest;
use App\Http\Resources\ChannelResource;
use App\Models\Channel;
use App\Models\User;
use App\Services\Channel\ChannelService;
use App\Support\OwnershipFilter\OwnershipFilter;
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
     * List users with their assigned channels
     */
    public function listUsersWithChannels(ListUsersWithChannelsRequest $request): JsonResponse
    {
        $paginator = $this->channelService->listUsersWithChannels($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'channels' => ChannelResource::collection($user->channels)->resolve(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Assign channels to a user
     */
    public function assignToUser(AssignChannelRequest $request, User $user): JsonResponse
    {
        $result = $this->channelService->assignToUser($user, $request->validated('channel_codes', []));

        return $this->sendResponse(['skipped_codes' => $result['skipped_codes']]);
    }

    /**
     * Channel options for select inputs
     */
    public function options(): JsonResponse
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = Channel::query()
            ->select(['id', 'code', 'name'])
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('id');

        $ownership->applyThroughChannel($query, 'code');

        $channels = $query->get();

        return $this->sendResponse([
            'data' => $channels->map(fn (Channel $channel) => [
                'code' => $channel->code,
                'name' => $channel->name,
            ]),
        ]);
    }
}

<?php

namespace App\Services\Channel;

use App\Actions\Channel\AssignChannelAction;
use App\Actions\Channel\BulkCreateChannelsAction;
use App\Actions\Channel\DeleteChannelAction;
use App\Actions\Channel\ListChannelsAction;
use App\Actions\Channel\ListUsersWithChannelsAction;
use App\Models\Channel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ChannelService
{
    public function __construct(
        private readonly ListChannelsAction $listChannelsAction,
        private readonly BulkCreateChannelsAction $bulkCreateChannelsAction,
        private readonly DeleteChannelAction $deleteChannelAction,
        private readonly AssignChannelAction $assignChannelAction,
        private readonly ListUsersWithChannelsAction $listUsersWithChannelsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters, User $user): LengthAwarePaginator
    {
        return $this->listChannelsAction->execute($filters, $user);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<Channel>, errors: list<string>}
     */
    public function bulkCreate(array $data): array
    {
        return $this->bulkCreateChannelsAction->execute($data);
    }

    public function delete(Channel $channel): void
    {
        $this->deleteChannelAction->execute($channel);
    }

    /**
     * @param  array<string>  $channelCodes
     */
    public function assignToUser(User $user, array $channelCodes): void
    {
        $this->assignChannelAction->execute($user, $channelCodes);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listUsersWithChannels(array $filters): LengthAwarePaginator
    {
        return $this->listUsersWithChannelsAction->execute($filters);
    }
}

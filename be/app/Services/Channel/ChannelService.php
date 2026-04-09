<?php

namespace App\Services\Channel;

use App\Actions\Channel\BulkCreateChannelsAction;
use App\Actions\Channel\DeleteChannelAction;
use App\Actions\Channel\ListChannelsAction;
use App\Models\Channel;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ChannelService
{
    public function __construct(
        private readonly ListChannelsAction $listChannelsAction,
        private readonly BulkCreateChannelsAction $bulkCreateChannelsAction,
        private readonly DeleteChannelAction $deleteChannelAction,
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
}

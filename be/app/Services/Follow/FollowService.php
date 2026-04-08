<?php

namespace App\Services\Follow;

use App\Actions\Follow\ListFollowsAction;
use App\Actions\Follow\SubscribeFollowAction;
use App\Actions\Follow\UnsubscribeFollowAction;
use App\Models\Follow;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class FollowService
{
    public function __construct(
        private readonly ListFollowsAction $listFollowsAction,
        private readonly SubscribeFollowAction $subscribeFollowAction,
        private readonly UnsubscribeFollowAction $unsubscribeFollowAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listFollowsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function subscribe(array $data): Follow
    {
        return $this->subscribeFollowAction->execute($data);
    }

    public function unsubscribe(array $data): void
    {
        $this->unsubscribeFollowAction->execute($data);
    }
}

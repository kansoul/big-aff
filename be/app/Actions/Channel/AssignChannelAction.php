<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Models\ChannelUser;
use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssignChannelAction
{
    /**
     * Sync a user's channel assignments from channel codes.
     * Channels already actively assigned to another user are skipped and returned.
     *
     * @param  array<string>  $channelCodes
     * @return array{skipped_codes: list<string>}
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $channelCodes): array
    {
        (new UserOwnerResource)->authorize($user);

        $channels = Channel::whereIn('code', $channelCodes)
            ->get(['id', 'code'])
            ->keyBy('id')
            ->map(fn ($c) => ['id' => (int) $c->id, 'code' => $c->code]);

        $channelIds = $channels->keys()->map(fn ($id) => (int) $id)->all();

        $requesterId = Auth::id();
        $skippedCodes = [];

        DB::transaction(function () use ($user, $channelIds, $channels, $requesterId, &$skippedCodes): void {
            // Lock channel rows to serialize concurrent assign requests for the same channels.
            Channel::whereIn('id', $channelIds)->lockForUpdate()->get(['id']);

            // Channels actively assigned to a different user.
            $takenRows = ChannelUser::query()
                ->whereIn('channel_id', $channelIds)
                ->where('user_id', '!=', $user->id)
                ->whereNull('deleted_at')
                ->get(['channel_id', 'user_id']);

            // Of the taken channels, split into those owned by the requester (can reassign)
            // vs owned by someone else (skip).
            $requesterOwnedIds = [];
            $skippedIds = [];

            foreach ($takenRows as $row) {
                $channelId = (int) $row->channel_id;
                if ((int) $row->user_id === (int) $requesterId) {
                    $requesterOwnedIds[] = $channelId;
                } else {
                    $skippedIds[] = $channelId;
                    if ($channels->has($channelId)) {
                        $skippedCodes[] = $channels->get($channelId)['code'];
                    }
                }
            }

            // Unassign requester's own channels so they can be assigned to the target user.
            if (! empty($requesterOwnedIds)) {
                ChannelUser::query()
                    ->where('user_id', $requesterId)
                    ->whereIn('channel_id', $requesterOwnedIds)
                    ->delete();
            }

            $allowedIds = array_values(array_diff($channelIds, $skippedIds));

            ChannelUser::query()
                ->where('user_id', $user->id)
                ->when(! empty($allowedIds), fn ($q) => $q->whereNotIn('channel_id', $allowedIds))
                ->delete();

            if (empty($allowedIds)) {
                return;
            }

            ChannelUser::withTrashed()
                ->where('user_id', $user->id)
                ->whereIn('channel_id', $allowedIds)
                ->whereNotNull('deleted_at')
                ->update(['deleted_at' => null, 'updated_at' => now()]);

            $existing = ChannelUser::withTrashed()
                ->where('user_id', $user->id)
                ->whereIn('channel_id', $allowedIds)
                ->pluck('channel_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_diff($allowedIds, $existing);

            if (! empty($toInsert)) {
                $now = now();
                $rows = array_map(fn (int $channelId) => [
                    'user_id' => $user->id,
                    'channel_id' => $channelId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toInsert);

                ChannelUser::insert($rows);
            }
        });

        return ['skipped_codes' => $skippedCodes];
    }
}

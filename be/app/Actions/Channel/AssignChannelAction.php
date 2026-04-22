<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use App\Models\ChannelUser;
use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class AssignChannelAction
{
    /**
     * Sync a user's channel assignments from channel codes.
     *
     * @param  array<string>  $channelCodes
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $channelCodes): void
    {
        $ownership = OwnershipFilter::forAuthUser();

        if (! $ownership->isAdmin() && ! \in_array($user->id, $ownership->allowedUserIds(), true)) {
            throw new AuthorizationException;
        }

        $channelIds = Channel::whereIn('code', $channelCodes)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        DB::transaction(function () use ($user, $channelIds): void {
            ChannelUser::query()
                ->where('user_id', $user->id)
                ->when(! empty($channelIds), fn ($q) => $q->whereNotIn('channel_id', $channelIds))
                ->delete();

            if (empty($channelIds)) {
                return;
            }

            ChannelUser::withTrashed()
                ->where('user_id', $user->id)
                ->whereIn('channel_id', $channelIds)
                ->whereNotNull('deleted_at')
                ->update(['deleted_at' => null, 'updated_at' => now()]);

            $existing = ChannelUser::withTrashed()
                ->where('user_id', $user->id)
                ->whereIn('channel_id', $channelIds)
                ->pluck('channel_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_diff($channelIds, $existing);

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
    }
}

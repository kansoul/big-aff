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
     * Channels already actively assigned to another user are skipped and returned.
     *
     * @param  array<string>  $channelCodes
     * @return array{skipped_codes: list<string>}
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $channelCodes): array
    {
        $ownership = OwnershipFilter::forAuthUser();

        if (! $ownership->isAdmin() && ! \in_array($user->id, $ownership->allowedUserIds(), true)) {
            throw new AuthorizationException;
        }

        $channels = Channel::whereIn('code', $channelCodes)
            ->get(['id', 'code'])
            ->keyBy('id')
            ->map(fn ($c) => ['id' => (int) $c->id, 'code' => $c->code]);

        $channelIds = $channels->keys()->map(fn ($id) => (int) $id)->all();

        $skippedCodes = [];

        DB::transaction(function () use ($user, $channelIds, $channels, &$skippedCodes): void {
            // Lock channel rows to serialize concurrent assign requests for the same channels.
            Channel::whereIn('id', $channelIds)->lockForUpdate()->get(['id']);

            // Channels actively assigned to a different user.
            $takenIds = ChannelUser::query()
                ->whereIn('channel_id', $channelIds)
                ->where('user_id', '!=', $user->id)
                ->whereNull('deleted_at')
                ->pluck('channel_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            foreach ($takenIds as $takenId) {
                if ($channels->has($takenId)) {
                    $skippedCodes[] = $channels->get($takenId)['code'];
                }
            }

            $allowedIds = array_values(array_diff($channelIds, $takenIds));

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

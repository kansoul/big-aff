<?php

namespace App\Support\OwnerResource;

use App\Models\Channel;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Database\Eloquent\Builder;

/**
 * For models that reference a Channel via the `channel_code` string FK (RevenueReport, RevenueChartReport, etc.).
 * Filters by channels the allowed users have access to via the `channel_user` pivot.
 */
final class ChannelLinkedOwnerResource extends OwnerResource
{
    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereIn(
            'channel_code',
            Channel::join('channel_user', 'channel_user.channel_id', '=', 'channels.id')
                ->whereIn('channel_user.user_id', $allowedIds)
                ->whereNull('channel_user.deleted_at')
                ->select('channels.code'),
        );
    }
}

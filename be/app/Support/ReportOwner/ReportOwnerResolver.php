<?php

namespace App\Support\ReportOwner;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel;
use App\Models\ChannelUser;

/**
 * Resolves the owner (user + main team) of a channel or account at sync time so
 * revenue/spend rows can be stamped with owner_user_id / owner_main_team_id.
 *
 * A channel/account is currently assigned to a single user, so the latest pivot
 * row wins. Results are memoized per instance — create one resolver per sync run.
 */
class ReportOwnerResolver
{
    /** @var array<string, array{owner_user_id: int|null, owner_main_team_id: int|null}> */
    private array $channelCache = [];

    /** @var array<string, array{owner_user_id: int|null, owner_main_team_id: int|null}> */
    private array $accountCache = [];

    /**
     * Owner attribution for a channel, keyed by its public `code`.
     *
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    public function forChannelCode(?string $channelCode): array
    {
        if (blank($channelCode)) {
            return $this->emptyOwner();
        }

        return $this->channelCache[$channelCode] ??= $this->resolveChannelOwner($channelCode);
    }

    /**
     * Owner attribution for an account, keyed by its external `account_id` string.
     *
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    public function forAccountId(?string $externalAccountId): array
    {
        if (blank($externalAccountId)) {
            return $this->emptyOwner();
        }

        return $this->accountCache[$externalAccountId] ??= $this->resolveAccountOwner($externalAccountId);
    }

    /**
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    private function resolveChannelOwner(string $channelCode): array
    {
        $channel = Channel::query()
            ->where('code', $channelCode)
            ->first(['id', 'main_team_id']);

        if (! $channel) {
            return $this->emptyOwner();
        }

        $ownerUserId = ChannelUser::query()
            ->where('channel_id', $channel->id)
            ->orderByDesc('id')
            ->value('user_id');

        return [
            'owner_user_id' => $ownerUserId !== null ? (int) $ownerUserId : null,
            'owner_main_team_id' => $channel->main_team_id !== null ? (int) $channel->main_team_id : null,
        ];
    }

    /**
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    private function resolveAccountOwner(string $externalAccountId): array
    {
        $account = Account::query()
            ->where('account_id', $externalAccountId)
            ->first(['id', 'main_team_id']);

        if (! $account) {
            return $this->emptyOwner();
        }

        $ownerUserId = AccountUser::query()
            ->where('account_id', $account->id)
            ->orderByDesc('id')
            ->value('user_id');

        return [
            'owner_user_id' => $ownerUserId !== null ? (int) $ownerUserId : null,
            'owner_main_team_id' => $account->main_team_id !== null ? (int) $account->main_team_id : null,
        ];
    }

    /**
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    private function emptyOwner(): array
    {
        return ['owner_user_id' => null, 'owner_main_team_id' => null];
    }
}

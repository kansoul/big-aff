<?php

namespace App\Support\OwnershipFilter;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\Channel;
use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Resolves the set of user IDs the authenticated user is allowed to act on behalf of,
 * and provides helpers to apply that constraint to Eloquent queries or guard single records.
 *
 * Access rules (non-admin):
 * - Self + all transitive descendants via `user_parent_child` (BFS):
 *   if A → B → C then A can access C's resources.
 * - Manager in a team → also accesses all leaders and members in that team.
 * - Admin users → no restriction applied (full access).
 */
final readonly class OwnershipFilter
{
    private function __construct(
        private bool $isAdmin,
        private array $allowedUserIds,
    ) {}

    /**
     * Build an OwnershipFilter for the currently authenticated user.
     */
    public static function forAuthUser(): self
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->is_admin) {
            return new self(isAdmin: true, allowedUserIds: []);
        }

        // BFS transitive descendants (self + all children recursively via user_parent_child).
        $allowedIds = $user->manageableUserIds();

        // Managers can also access all leaders and members in their teams.
        $managerTeamIds = TeamUser::query()
            ->where('user_id', $user->id)
            ->where('team_role', TeamRole::MANAGER->value)
            ->pluck('team_id')
            ->all();

        if ($managerTeamIds !== []) {
            $teamMemberIds = TeamUser::query()
                ->whereIn('team_id', $managerTeamIds)
                ->whereIn('team_role', [TeamRole::LEADER->value, TeamRole::MEMBER->value])
                ->pluck('user_id')
                ->all();

            $allowedIds = array_values(array_unique(array_merge($allowedIds, $teamMemberIds)));
        }

        return new self(isAdmin: false, allowedUserIds: $allowedIds);
    }

    /**
     * Apply a `whereIn` constraint on $column to the given query.
     * No-op for admin users.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  string  $column  The owner column on the model (default: 'created_by')
     */
    public function applyTo(Builder $query, string $column = 'created_by'): void
    {
        if ($this->isAdmin) {
            return;
        }

        $query->whereIn($column, $this->allowedUserIds);
    }

    /**
     * No-op for admin users; otherwise always passes for authorized owners.
     */
    public function authorize(?int $ownerId): void
    {
        if ($this->isAdmin) {
            return;
        }

        if (! in_array($ownerId, $this->allowedUserIds, true)) {
            throw new AuthorizationException;
        }
    }

    /**
     * Apply ownership via a subquery when the model does not have a direct owner column.
     * No-op for admin users.
     *
     * Example — filter follows through their site's created_by:
     *   $ownership->applyThrough($query, 'site_id', fn(array $ids) =>
     *       Site::whereIn('created_by', $ids)->select('id')
     *   );
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  string  $column  Foreign key column on the current model
     * @param  \Closure(array<int, int>): Builder<Model>  $subquery
     *                                                               Receives the allowed user IDs and must return a Builder that selects the related IDs.
     */
    public function applyThrough(Builder $query, string $column, \Closure $subquery): void
    {
        if ($this->isAdmin) {
            return;
        }

        $query->whereIn($column, $subquery($this->allowedUserIds));
    }

    /**
     * Apply ownership through the `account_user` pivot table.
     * Ownership is determined by which accounts the allowed users have access to,
     * not by `accounts.created_by`.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  string  $column  Foreign key column on the current model (default: 'account_id')
     */
    public function applyThroughAccount(Builder $query, string $column = 'account_id'): void
    {
        $this->applyThrough(
            $query,
            $column,
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );
    }

    /**
     * Apply ownership through the `channel_user` pivot table.
     * Ownership is determined by which channels the allowed users have access to,
     * not by `channels.created_by`.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  string  $column  Foreign key column on the current model (default: 'channel_code')
     */
    public function applyThroughChannel(Builder $query, string $column = 'channel_code'): void
    {
        $this->applyThrough(
            $query,
            $column,
            fn (array $ids) => Channel::join('channel_user', 'channel_user.channel_id', '=', 'channels.id')
                ->whereIn('channel_user.user_id', $ids)
                ->select('channels.code'),
        );
    }

    public function isAdmin(): bool
    {
        return $this->isAdmin;
    }

    /**
     * Returns the resolved set of allowed user IDs for non-admin users.
     *
     * Do NOT call this for admin users — admins have unrestricted access and there
     * is no meaningful "allowed list". Guard with `isAdmin()` first:
     *
     *   if (! $ownership->isAdmin()) {
     *       $userIds = array_intersect($userIds, $ownership->allowedUserIds());
     *   }
     *
     * @return array<int, int>
     *
     * @throws \LogicException if called for an admin user
     */
    public function allowedUserIds(): array
    {
        if ($this->isAdmin) {
            throw new \LogicException('allowedUserIds() must not be called for admin users — they have unrestricted access. Guard with isAdmin() first.');
        }

        return $this->allowedUserIds;
    }
}

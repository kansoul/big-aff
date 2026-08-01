<?php

namespace App\Support\OwnershipFilter;

use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\BusinessCenter;
use App\Models\Site;
use App\Models\Team;
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
 * - Leader in a team → accesses only their child users (already covered by BFS above).
 * - Admin users → no restriction applied (full access).
 *
 * Team management authorization:
 * - `authorizeTeamManagement()` — allowed for admin, manager, or leader of that team.
 * - `authorizeAccount()` — allowed if any user in allowedUserIds has the account assigned.
 * - `authorizeBusinessCenter()` — allowed if any user in allowedUserIds is in the BC's team.
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
        return once(function () {
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
        });
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
     * The subquery returns `accounts.account_id` (the string business ID used by
     * `insight_reports`, `campaign_reports`, etc.) to match the `account_id` column
     * convention on report tables.
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
                ->select('accounts.account_id'),
        );
    }

    /**
     * Apply ownership through the `team_user` pivot table.
     * Ownership is determined by which teams the allowed users belong to,
     * not by `<table>.created_by`. Use for resources that belong to a team
     * (e.g. accounts, business_centers) rather than to a specific user.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  string  $column  Foreign key column on the current model (default: 'team_id')
     */
    public function applyThroughTeam(Builder $query, string $column = 'team_id'): void
    {
        $this->applyThrough(
            $query,
            $column,
            fn (array $ids) => TeamUser::whereIn('user_id', $ids)->select('team_id'),
        );
    }

    /**
     * Guard team management operations (assign members, update, delete).
     * Allowed for admin, manager, or leader of the given team.
     * Leaders are limited to their own child users by the allowedUserIds scope —
     * this method only verifies the role, not the target users.
     *
     * @throws AuthorizationException
     */
    public function authorizeTeamManagement(Team $team): void
    {
        if ($this->isAdmin) {
            return;
        }

        $canManage = TeamUser::query()
            ->where('team_id', $team->id)
            ->where('user_id', Auth::id())
            ->whereIn('team_role', [TeamRole::MANAGER->value, TeamRole::LEADER->value])
            ->exists();

        if (! $canManage) {
            throw new AuthorizationException;
        }
    }

    /**
     * Guard update / delete on an Account.
     * Allowed if any user in allowedUserIds has the account assigned via `account_user`.
     *
     * @throws AuthorizationException
     */
    public function authorizeAccount(Account $account): void
    {
        if ($this->isAdmin) {
            return;
        }

        $accessible = Account::where('id', $account->id);
        $this->applyThroughAccount($accessible);

        if (! $accessible->exists()) {
            throw new AuthorizationException;
        }
    }

    /**
     * Guard update / delete on a BusinessCenter.
     * Allowed if any user in allowedUserIds belongs to the BC's team.
     *
     * @throws AuthorizationException
     */
    public function authorizeBusinessCenter(BusinessCenter $businessCenter): void
    {
        if ($this->isAdmin) {
            return;
        }

        $accessible = BusinessCenter::where('id', $businessCenter->id);
        $this->applyThroughTeam($accessible);

        if (! $accessible->exists()) {
            throw new AuthorizationException;
        }
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

    /**
     * Guard create / update / delete on a Site.
     * Allowed if the site was created by an allowed user, or if any allowed user
     * has been explicitly assigned to the site via the `users` pivot.
     *
     * @throws AuthorizationException
     */
    public function authorizeSite(Site $site): void
    {
        if ($this->isAdmin) {
            return;
        }

        $accessible = in_array($site->created_by, $this->allowedUserIds, true)
            || $site->users()->whereIn('users.id', $this->allowedUserIds)->exists();

        if (! $accessible) {
            throw new AuthorizationException;
        }
    }

    /**
     * Guard create / update / delete on a Post.
     * Allowed if the post was created by an allowed user, or if the current auth
     * user has been explicitly assigned to the post via `assignedUsers`.
     *
     * @throws AuthorizationException
     */
    public function authorizePost(Post $post): void
    {
        if ($this->isAdmin) {
            return;
        }

        $accessible = in_array($post->created_by, $this->allowedUserIds, true)
            || $post->assignedUsers()->where('users.id', Auth::id())->exists();

        if (! $accessible) {
            throw new AuthorizationException;
        }
    }
}

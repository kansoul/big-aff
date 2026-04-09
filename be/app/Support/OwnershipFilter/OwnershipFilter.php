<?php

namespace App\Support\OwnershipFilter;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Resolves the set of user IDs the authenticated user is allowed to act on behalf of,
 * and provides helpers to apply that constraint to Eloquent queries or guard single records.
 *
 * - Admin users → no restriction applied (full access)
 * - Regular users → themselves + their child users (via `user_parent_child`)
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

        return new self(
            isAdmin: $user->is_admin,
            allowedUserIds: array_merge([$user->id], $user->child_user_ids),
        );
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

    /** @return array<int, int> */
    public function allowedUserIds(): array
    {
        return $this->allowedUserIds;
    }
}

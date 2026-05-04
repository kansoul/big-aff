<?php

namespace App\Support\OwnerResource\Base;

use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Encapsulates the ownership scoping rule for a specific resource type.
 *
 * Each concrete subclass:
 *  - Defines `scope()` to apply list-level ownership filtering.
 *  - Overrides `authorize()` to guard write operations (update / delete).
 *
 * The admin short-circuit and ID resolution are handled here, so subclasses
 * never need to repeat that logic.
 *
 * Usage:
 *   (new SiteOwnerResource)->applyTo($query);       // list
 *   (new SiteOwnerResource)->authorize($site);      // mutate
 */
abstract class OwnerResource
{
    final public function applyTo(Builder $query): void
    {
        $filter = OwnershipFilter::forAuthUser();

        if ($filter->isAdmin()) {
            return;
        }

        $this->scope($query, $filter->allowedUserIds());
    }

    /**
     * Guard a write operation (update / delete) on a specific record.
     * Handles admin short-circuit, then delegates to authorizeRecord().
     */
    final public function authorize(Model $model): void
    {
        $filter = OwnershipFilter::forAuthUser();

        if ($filter->isAdmin()) {
            return;
        }

        $this->authorizeRecord($model, $filter->allowedUserIds());
    }

    /**
     * Whether the auth user is an admin (full access, no ownership filter applied).
     * Use this to skip non-admin logic in actions that mix resource guards with
     * additional intersect/authorize operations (e.g. AssignTeamAction).
     */
    final public function isAdmin(): bool
    {
        return OwnershipFilter::forAuthUser()->isAdmin();
    }

    /**
     * Returns the raw allowed user IDs for the current non-admin auth user.
     * Call isAdmin() first — this throws for admin users (unrestricted access).
     *
     * @return array<int, int>
     */
    final public function allowedUserIds(): array
    {
        return OwnershipFilter::forAuthUser()->allowedUserIds();
    }

    /**
     * Apply resource-specific authorization for a single record.
     * Receives the pre-resolved allowedIds (admin users never reach this).
     * Subclasses that support mutation MUST override this method.
     *
     * @param  array<int, int>  $allowedIds
     */
    protected function authorizeRecord(Model $model, array $allowedIds): void
    {
        throw new \LogicException(static::class.' does not implement authorizeRecord().');
    }

    /**
     * Apply resource-specific ownership constraints to the query.
     *
     * @param  array<int, int>  $allowedIds  User IDs the current auth user may act on behalf of.
     */
    abstract protected function scope(Builder $query, array $allowedIds): void;
}

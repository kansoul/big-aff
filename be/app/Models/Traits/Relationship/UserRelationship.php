<?php

namespace App\Models\Traits\Relationship;

use App\Models\File;
use App\Models\Role;
use App\Models\Site;
use App\Models\Style;
use App\Models\Team;
use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use App\Models\UserParentChild;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * UserRelationship trait
 */
trait UserRelationship
{
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function style(): BelongsTo
    {
        return $this->belongsTo(Style::class);
    }

    public function avatar(): BelongsTo
    {
        return $this->belongsTo(File::class, 'avatar_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Child users linked via `user_parent_child` (this user is the parent).
     *
     * @return BelongsToMany<User, $this>
     */
    public function children(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_parent_child', 'parent_user_id', 'child_user_id');
    }

    /** Rows in `user_parent_child` where this user is the parent. */
    public function assignedChildrenLinks(): HasMany
    {
        return $this->hasMany(UserParentChild::class, 'parent_user_id');
    }

    /** At most one row where this user is the child in `user_parent_child`. */
    public function assignedParentLink(): HasOne
    {
        return $this->hasOne(UserParentChild::class, 'child_user_id');
    }

    /**
     * Sites assigned to this user.
     *
     * @return BelongsToMany<Site, $this>
     */
    public function sites(): BelongsToMany
    {
        return $this->belongsToMany(Site::class, 'user_sites')
            ->withTimestamps()
            ->withPivot('deleted_at');
    }

    /**
     * Teams this user belongs to.
     *
     * @return BelongsToMany<Team, $this>
     */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_user')
            ->withPivot(['joined_at', 'team_role'])
            ->withTimestamps();
    }

    /**
     * @return HasOne<UserCampaignRuleSetting>
     */
    public function campaignRuleSetting(): HasOne
    {
        return $this->hasOne(UserCampaignRuleSetting::class);
    }
}

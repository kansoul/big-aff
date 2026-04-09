<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait StyleRelationship
{
    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'style_id');
    }

    /**
     * Backward-compatible accessor: $style->style_code maps to the `code` column.
     */
    protected function styleCode(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->code,
        );
    }
}

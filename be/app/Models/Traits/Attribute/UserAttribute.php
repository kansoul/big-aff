<?php

namespace App\Models\Traits\Attribute;

use Illuminate\Database\Eloquent\Casts\Attribute;

/**
 * Trait UserAttribute.
 */
trait UserAttribute
{
    /**
     * Get the user's full name.
     */
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->first_name} {$this->last_name}"
        );
    }
}

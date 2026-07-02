<?php

namespace App\Models\Traits\Attribute;

use Illuminate\Database\Eloquent\Casts\Attribute;

trait AccountAttribute
{
    /**
     * Always persist the account status in UPPERCASE (e.g. "ACTIVE" not "active").
     */
    protected function status(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value): ?string => $value !== null ? mb_strtoupper($value) : null,
        );
    }
}

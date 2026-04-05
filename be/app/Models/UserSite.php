<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserSite extends Pivot
{
    use SoftDeletes;

    protected $table = 'user_sites';
}

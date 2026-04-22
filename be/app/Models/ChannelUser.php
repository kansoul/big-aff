<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChannelUser extends Pivot
{
    use SoftDeletes;

    protected $table = 'channel_user';
}

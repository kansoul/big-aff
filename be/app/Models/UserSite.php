<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserSite extends Pivot
{
    use HasFactory, SoftDeletes;

    protected $table = 'user_sites';

    protected $fillable = [
        'user_id',
        'site_id',
    ];
}

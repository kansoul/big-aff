<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxAccountConversion extends Model
{
    use HasFactory;

    protected $fillable = [
        'source',
        'account_id',
        'conversion_type',
        'conversion_action_id',
        'name',
        'status',
    ];
}

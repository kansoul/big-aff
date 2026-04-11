<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdClient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ad_client_id',
        'product_code',
        'product_name',
    ];
}

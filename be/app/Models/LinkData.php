<?php

namespace App\Models;

use App\Models\Traits\Relationship\LinkDataRelationship;
use Illuminate\Database\Eloquent\Model;

class LinkData extends Model
{
    use LinkDataRelationship;

    protected $table = 'link_datas';

    public $timestamps = false;

    protected $fillable = [
        'ads_link_id',
        'campaign_id',
        'style_code',
        'channel_code',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}

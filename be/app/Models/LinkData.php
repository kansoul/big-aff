<?php

namespace App\Models;

use App\Models\Traits\Relationship\LinkDataRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LinkData extends Model
{
    use HasFactory, LinkDataRelationship, SoftDeletes;

    protected $table = 'link_datas';

    protected $fillable = [
        'ads_link_id',
        'campaign_id',
        'style_code',
        'channel_code',
        'created_by',
        'updated_by',
    ];
}

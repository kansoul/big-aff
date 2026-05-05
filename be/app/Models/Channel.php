<?php

namespace App\Models;

use App\Models\Traits\Relationship\ChannelRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Channel extends Model
{
    use ChannelRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'main_team_id',
        'code',
        'name',
        'is_active',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'main_team_id' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}

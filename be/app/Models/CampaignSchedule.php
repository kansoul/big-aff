<?php

namespace App\Models;

use App\Models\Traits\Relationship\CampaignScheduleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignSchedule extends Model
{
    use CampaignScheduleRelationship, HasFactory;

    protected $fillable = [
        'created_by',
        'name',
        'turn_on_time',
        'turn_off_time',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}

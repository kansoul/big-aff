<?php

namespace App\Models;

use App\Models\Traits\Relationship\RealtimeReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealtimeReport extends Model
{
    use HasFactory, RealtimeReportRelationship;

    protected $table = 'realtime_reports';

    protected $fillable = [
        'event_time',
        'campaign_id',
        'view_count',
        'redirect_count',
        'submit_form_count',
    ];

    protected function casts(): array
    {
        return [
            'event_time' => 'date',
            'view_count' => 'integer',
            'redirect_count' => 'integer',
            'submit_form_count' => 'integer',
        ];
    }
}

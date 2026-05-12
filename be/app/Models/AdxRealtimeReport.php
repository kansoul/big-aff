<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxLinkDataReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxRealtimeReport extends Model
{
    use AdxLinkDataReportRelationship, HasFactory;

    protected $fillable = [
        'report_date',
        'adx_link_data_id',
        'landing_views',
        'get_game_link_clicks',
        'detail_views',
        'get_bonus_clicks',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'landing_views' => 'integer',
            'get_game_link_clicks' => 'integer',
            'detail_views' => 'integer',
            'get_bonus_clicks' => 'integer',
        ];
    }
}

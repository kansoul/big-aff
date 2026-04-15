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
        'link_data_id',
        'view_article_count',
        'view_search_count',
        'click_keyword_count',
        'click_ad_count',
    ];

    protected function casts(): array
    {
        return [
            'event_time' => 'date',
            'view_article_count' => 'integer',
            'view_search_count' => 'integer',
            'click_keyword_count' => 'integer',
            'click_ad_count' => 'integer',
        ];
    }
}

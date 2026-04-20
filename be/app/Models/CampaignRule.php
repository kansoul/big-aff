<?php

namespace App\Models;

use App\Enums\EntityTypeEnum;
use App\Models\Traits\Relationship\CampaignRuleRelationship;
use App\Observers\CampaignRuleObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[ObservedBy(CampaignRuleObserver::class)]
class CampaignRule extends Model
{
    use CampaignRuleRelationship, HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'code_rule',
        'entity_type',
        'is_active',
        'expired_at',
        'min_roi',
        'min_profit',
        'min_revenue',
        'min_spend',
        'max_cpa',
        'min_conversion',
        'min_spend_adset',
        'start_hour',
        'end_hour',
    ];

    protected function casts(): array
    {
        return [
            'entity_type' => EntityTypeEnum::class,
            'is_active' => 'boolean',
            'expired_at' => 'datetime',
            'min_roi' => 'decimal:2',
            'min_profit' => 'decimal:2',
            'min_revenue' => 'decimal:2',
            'min_spend' => 'decimal:2',
            'max_cpa' => 'decimal:2',
            'min_spend_adset' => 'decimal:2',
        ];
    }
}

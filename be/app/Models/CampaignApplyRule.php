<?php

namespace App\Models;

use App\Models\Traits\Relationship\CampaignApplyRuleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignApplyRule extends Model
{
    use CampaignApplyRuleRelationship, HasFactory;

    protected $fillable = [
        'campaign_rule_id',
        'sourceable_type',
        'sourceable_id',
    ];
}

<?php

namespace App\Models;

use App\Enums\RuleActionMode;
use App\Models\Traits\Relationship\UserCampaignRuleSettingRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCampaignRuleSetting extends Model
{
    use HasFactory, UserCampaignRuleSettingRelationship;

    protected $fillable = [
        'user_id',
        'campaign_rule_auto_enabled',
        'action_mode',
        'telegram_chat_id',
    ];

    protected function casts(): array
    {
        return [
            'campaign_rule_auto_enabled' => 'boolean',
            'action_mode' => RuleActionMode::class,
        ];
    }
}

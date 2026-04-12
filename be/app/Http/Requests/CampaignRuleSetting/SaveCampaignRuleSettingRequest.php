<?php

namespace App\Http\Requests\CampaignRuleSetting;

use App\Enums\RuleActionMode;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class SaveCampaignRuleSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'campaign_rule_auto_enabled' => ['required', 'boolean'],
            'action_mode' => ['required', new Enum(RuleActionMode::class)],
            'telegram_chat_id' => ['nullable', 'string'],
        ];
    }
}

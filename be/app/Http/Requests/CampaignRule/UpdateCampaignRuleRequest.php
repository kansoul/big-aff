<?php

namespace App\Http\Requests\CampaignRule;

use App\Enums\EntityTypeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCampaignRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'entity_type' => ['sometimes', Rule::enum(EntityTypeEnum::class)],
            'is_active' => ['sometimes', 'boolean'],
            'expired_at' => ['sometimes', 'nullable', 'date', 'after:now'],
            'campaign_ids' => ['sometimes', 'nullable', 'array'],
            'campaign_ids.*' => ['integer', 'exists:campaigns,campaign_ids'],

            // Campaign-level conditions
            'min_roi' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_profit' => ['sometimes', 'nullable', 'numeric'],
            'min_revenue' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_spend' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            // Ad/Adset-level conditions
            'max_cpa' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_conversion' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'min_spend_adset' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            // Time window
            'start_hour' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_hour' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ];
    }
}

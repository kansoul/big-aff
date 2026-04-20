<?php

namespace App\Http\Requests\CampaignRule;

use App\Enums\EntityTypeEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCampaignRuleRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'entity_type' => ['required', Rule::enum(EntityTypeEnum::class)],
            'is_active' => ['sometimes', 'boolean'],
            'expired_at' => ['nullable', 'date', 'after:now'],
            'campaign_ids' => ['sometimes', 'array'],
            'campaign_ids.*' => ['integer', 'exists:campaigns,campaign_id'],

            // Campaign-level conditions
            'min_roi' => ['nullable', 'numeric', 'min:0'],
            'min_profit' => ['nullable', 'numeric'],
            'min_revenue' => ['nullable', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],

            // Ad/Adset-level conditions
            'max_cpa' => ['nullable', 'numeric', 'min:0'],
            'min_conversion' => ['nullable', 'integer', 'min:0'],
            'min_spend_adset' => ['nullable', 'numeric', 'min:0'],

            // Time window
            'start_hour' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_hour' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ];
    }
}

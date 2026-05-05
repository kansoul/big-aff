<?php

namespace App\Http\Requests\MainTeam;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMainTeamRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'sync_campaign_reports' => ['sometimes', 'boolean'],
            'account_ids' => ['sometimes', 'array'],
            'account_ids.*' => ['string', 'max:255'],
            'channel_codes' => ['sometimes', 'array'],
            'channel_codes.*' => ['string', 'max:100'],
        ];
    }
}

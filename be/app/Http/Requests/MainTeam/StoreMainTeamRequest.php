<?php

namespace App\Http\Requests\MainTeam;

use Illuminate\Foundation\Http\FormRequest;

class StoreMainTeamRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sync_campaign_reports' => ['nullable', 'boolean'],
            'account_ids' => ['sometimes', 'array'],
            'account_ids.*' => ['string', 'max:255'],
        ];
    }
}

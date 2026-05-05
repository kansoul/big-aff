<?php

namespace App\Http\Requests\RevenueStats;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RevenueStatsRequest extends FormRequest
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
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'team_ids' => ['nullable', 'array', 'required_with:user_ids', 'min:1'],
            'team_ids.*' => ['integer', 'exists:teams,id'],
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'main_team_ids' => ['nullable', 'array'],
            'main_team_ids.*' => ['integer', 'exists:main_teams,id'],
            'account_ids' => ['nullable', 'array'],
            'account_ids.*' => ['integer', 'exists:accounts,id'],
            'channel_codes' => ['nullable', 'array'],
            'channel_codes.*' => ['string', 'exists:channels,code'],
        ];
    }
}

<?php

namespace App\Http\Requests\Account;

use App\Enums\AdsType;
use App\Support\Accounts\AccountsAccess;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAccountRequest extends FormRequest
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
            'ads_type' => ['required', 'string', Rule::in(AdsType::values())],
            'business_center_id' => ['nullable', 'integer', 'exists:business_centers,id'],
            'main_team_id' => $this->canAssignMainTeam()
                ? ['nullable', 'integer', 'exists:main_teams,id']
                : ['prohibited'],
            'status' => ['nullable', 'string', 'max:50'],
            'is_special' => ['nullable', 'boolean'],
            'sync_to_mcc' => ['nullable', 'boolean'],
            'roas_enabled' => ['nullable', 'boolean'],
            'gtag_enabled' => ['nullable', 'boolean'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],

            'lines' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lines.required' => 'Please provide at least one account in the format: account_id|account_name',
        ];
    }

    private function canAssignMainTeam(): bool
    {
        return AccountsAccess::canUseMainTeams($this->user());
    }
}

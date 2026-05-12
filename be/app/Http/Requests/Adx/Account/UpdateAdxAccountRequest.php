<?php

namespace App\Http\Requests\Adx\Account;

use App\Support\Accounts\AccountsAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdxAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $account = $this->route('adxAccount');
        $source = $this->input('source', $account?->source);

        return [
            'source' => ['sometimes', 'string', Rule::in(['google', 'facebook', 'native', 'other'])],
            'account_id' => [
                'sometimes',
                'string',
                'max:191',
                Rule::unique('adx_accounts', 'account_id')->where('source', $source)->ignore($account?->id),
            ],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'business_center_id' => ['sometimes', 'nullable', 'integer', 'exists:business_centers,id'],
            'team_id' => ['sometimes', 'nullable', 'integer', 'exists:teams,id'],
            'main_team_id' => AccountsAccess::canUseMainTeams($this->user())
                ? ['sometimes', 'nullable', 'integer', 'exists:main_teams,id']
                : ['prohibited'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'is_special' => ['sometimes', 'boolean'],
            'sync_to_mcc' => ['sometimes', 'boolean'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}

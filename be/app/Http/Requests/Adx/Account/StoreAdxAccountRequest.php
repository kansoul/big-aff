<?php

namespace App\Http\Requests\Adx\Account;

use App\Support\Accounts\AccountsAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdxAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source' => ['required', 'string', Rule::in(['google', 'facebook', 'native', 'other'])],
            'account_id' => ['required', 'string', 'max:191', Rule::unique('adx_accounts', 'account_id')->where('source', $this->input('source'))],
            'account_name' => ['nullable', 'string', 'max:255'],
            'business_center_id' => ['nullable', 'integer', 'exists:business_centers,id'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'main_team_id' => AccountsAccess::canUseMainTeams($this->user())
                ? ['nullable', 'integer', 'exists:main_teams,id']
                : ['prohibited'],
            'status' => ['nullable', 'string', 'max:50'],
            'is_special' => ['nullable', 'boolean'],
            'sync_to_mcc' => ['nullable', 'boolean'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}

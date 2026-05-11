<?php

namespace App\Http\Requests\Adx\Account;

use Illuminate\Foundation\Http\FormRequest;

class AssignAdxAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_ids' => ['present', 'array'],
            'account_ids.*' => ['required', 'string', 'max:191', 'distinct', 'exists:adx_accounts,account_id'],
        ];
    }
}

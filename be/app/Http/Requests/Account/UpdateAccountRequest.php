<?php

namespace App\Http\Requests\Account;

use App\Enums\AdsType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
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
        $accountId = $this->route('account')?->id;

        return [
            'account_id' => ['sometimes', 'string', 'max:255', Rule::unique('accounts', 'account_id')->ignore($accountId)],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ads_type' => ['sometimes', 'string', Rule::in(AdsType::values())],
            'business_center_id' => ['sometimes', 'nullable', 'integer', 'exists:business_centers,id'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'is_special' => ['sometimes', 'boolean'],
            'sync_to_mcc' => ['sometimes', 'boolean'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}

<?php

namespace App\Http\Requests\Adx\Account;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkStoreAdxAccountsRequest extends FormRequest
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
            'source' => ['required', 'string', Rule::in(['google', 'facebook', 'native', 'other'])],
            'status' => ['nullable', 'string', 'max:50'],
            'is_special' => ['nullable', 'boolean'],
            'sync_to_mcc' => ['nullable', 'boolean'],
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
}

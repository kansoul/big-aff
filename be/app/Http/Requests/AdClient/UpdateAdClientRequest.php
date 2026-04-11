<?php

namespace App\Http\Requests\AdClient;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdClientRequest extends FormRequest
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
            'ad_client_id' => ['sometimes', 'string', 'max:255', Rule::unique('ad_clients', 'ad_client_id')->ignore($this->route('ad_client'))],
            'product_code' => ['sometimes', 'nullable', 'string', 'max:255'],
            'product_name' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}

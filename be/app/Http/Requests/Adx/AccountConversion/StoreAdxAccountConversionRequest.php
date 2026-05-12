<?php

namespace App\Http\Requests\Adx\AccountConversion;

use Illuminate\Foundation\Http\FormRequest;

class StoreAdxAccountConversionRequest extends FormRequest
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
            'source' => ['required', 'string', 'max:50'],
            'account_id' => ['required', 'string', 'max:191'],
            'conversion_type' => ['required', 'string', 'max:50'],
            'conversion_action_id' => ['required', 'string', 'max:191'],
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

<?php

namespace App\Http\Requests\Adx\AccountConversion;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdxAccountConversionRequest extends FormRequest
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
            'conversion_action_id' => ['sometimes', 'required', 'string', 'max:191'],
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'max:50'],
        ];
    }
}

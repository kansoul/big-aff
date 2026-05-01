<?php

namespace App\Http\Requests\Style;

use Illuminate\Foundation\Http\FormRequest;

class BulkStoreStyleRequest extends FormRequest
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
            'lines' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lines.required' => 'Please provide at least one line in the format: name|code',
        ];
    }
}

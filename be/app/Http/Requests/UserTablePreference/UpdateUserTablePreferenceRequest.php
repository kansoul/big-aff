<?php

namespace App\Http\Requests\UserTablePreference;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserTablePreferenceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'toggled_columns' => ['sometimes', 'array'],
            'toggled_columns.*' => ['string'],
            'additional_settings' => ['sometimes', 'array'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    public function messages(): array
    {
        return [
            'toggled_columns.required' => 'Toggled columns is required.',
            'toggled_columns.array' => 'Toggled columns must be an array.',
            'toggled_columns.*.required' => 'Toggled column is required.',
            'toggled_columns.*.string' => 'Toggled column must be a string.',
            'additional_settings.required' => 'Additional settings is required.',
            'additional_settings.array' => 'Additional settings must be an array.',
        ];
    }
}

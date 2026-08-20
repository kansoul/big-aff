<?php

namespace App\Http\Requests\GoogleConversion;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGoogleConversionRequest extends FormRequest
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
            'page_view' => ['nullable', 'string', 'max:255'],
            'redirect' => ['nullable', 'string', 'max:255'],
            'submit_form' => ['nullable', 'string', 'max:255'],
        ];
    }
}

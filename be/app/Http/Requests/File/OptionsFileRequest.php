<?php

namespace App\Http\Requests\File;

use Illuminate\Foundation\Http\FormRequest;

class OptionsFileRequest extends FormRequest
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
            'alt_text' => ['required', 'string', 'max:255'],
        ];
    }
}

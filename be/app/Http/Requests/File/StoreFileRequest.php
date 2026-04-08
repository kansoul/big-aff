<?php

namespace App\Http\Requests\File;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreFileRequest extends FormRequest
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
            'file' => ['required', 'file', 'max:51200'],
            'directory' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\/]+$/', 'in:'.implode(',', array_values(config('filesystems.uploads.directories')))],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ];
    }
}

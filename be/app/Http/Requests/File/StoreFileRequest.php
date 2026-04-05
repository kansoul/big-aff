<?php

namespace App\Http\Requests\File;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
        $allowed = config('filesystems.uploads.allowed', ['public']);

        return [
            'file' => ['required', 'file', 'max:51200'],
            'disk' => ['nullable', 'string', Rule::in($allowed)],
            'directory' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z0-9_\-\/]+$/'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ];
    }
}

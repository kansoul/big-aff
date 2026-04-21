<?php

namespace App\Http\Requests\Log;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TailLogRequest extends FormRequest
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
            'file' => ['nullable', 'string', 'regex:/^laravel(?:-\d{4}-\d{2}-\d{2})?\.log$/'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}

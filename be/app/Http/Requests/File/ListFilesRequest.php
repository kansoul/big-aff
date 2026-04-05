<?php

namespace App\Http\Requests\File;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ListFilesRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'created_from' => ['nullable', 'date'],
            'created_to' => ['nullable', 'date', 'after:created_from'],
        ];
    }
}

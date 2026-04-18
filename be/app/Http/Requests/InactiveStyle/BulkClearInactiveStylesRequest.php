<?php

namespace App\Http\Requests\InactiveStyle;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BulkClearInactiveStylesRequest extends FormRequest
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
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}

<?php

namespace App\Http\Requests\Lead;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public static function fieldRules(): array
    {
        return [
            'website_url' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:50'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:50'],
            'date_of_birth' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'before:today'],
            'cell_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'zip' => ['sometimes', 'nullable', 'string', 'max:20'],
        ];
    }
}

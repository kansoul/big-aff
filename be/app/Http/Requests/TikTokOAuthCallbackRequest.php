<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TikTokOAuthCallbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'auth_code' => ['required_without_all:code,error', 'nullable', 'string'],
            'code' => ['required_without_all:auth_code,error', 'nullable', 'string'],
            'state' => ['nullable', 'string'],
            'error' => ['nullable', 'string'],
            'error_description' => ['nullable', 'string'],
        ];
    }

    public function authorizationCode(): string
    {
        return (string) ($this->validated('auth_code') ?: $this->validated('code'));
    }
}

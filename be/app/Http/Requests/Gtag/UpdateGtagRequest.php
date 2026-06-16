<?php

namespace App\Http\Requests\Gtag;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGtagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['nullable', 'string', 'max:255'],
            'article_view' => ['nullable', 'string', 'max:255'],
            'rsu_click' => ['nullable', 'string', 'max:255'],
            'search_view' => ['nullable', 'string', 'max:255'],
            'search_click' => ['nullable', 'string', 'max:255'],
        ];
    }
}

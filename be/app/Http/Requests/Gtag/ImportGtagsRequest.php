<?php

namespace App\Http\Requests\Gtag;

use Illuminate\Foundation\Http\FormRequest;

class ImportGtagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lines' => ['required', 'string'],
        ];
    }
}

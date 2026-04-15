<?php

namespace App\Http\Requests\GoogleConversion;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateGoogleConversionsRequest extends FormRequest
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
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'rows.*.article_view' => ['nullable', 'string', 'max:255'],
            'rows.*.rsu_click' => ['nullable', 'string', 'max:255'],
            'rows.*.search_view' => ['nullable', 'string', 'max:255'],
            'rows.*.search_click' => ['nullable', 'string', 'max:255'],
        ];
    }
}

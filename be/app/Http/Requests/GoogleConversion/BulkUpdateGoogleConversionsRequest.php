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
            'rows.*.account_id' => ['required', 'string', 'exists:accounts,account_id'],
            'rows.*.article_view' => ['nullable', 'string', 'max:255'],
            'rows.*.rsu_click' => ['nullable', 'string', 'max:255'],
            'rows.*.search_view' => ['nullable', 'string', 'max:255'],
            'rows.*.search_click' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'rows.*.account_id.exists' => 'The account_id does not exist.',
            'rows.*.account_id.required' => 'The account_id is required.',
            'rows.*.article_view.string' => 'The article_view must be a string.',
            'rows.*.article_view.max' => 'The article_view must be a string.',
            'rows.*.rsu_click.string' => 'The rsu_click must be a string.',
            'rows.*.rsu_click.max' => 'The rsu_click must be a string.',
            'rows.*.search_view.string' => 'The search_view must be a string.',
            'rows.*.search_view.max' => 'The search_view must be a string.',
            'rows.*.search_click.string' => 'The search_click must be a string.',
            'rows.*.search_click.max' => 'The search_click must be a string.',
        ];
    }
}

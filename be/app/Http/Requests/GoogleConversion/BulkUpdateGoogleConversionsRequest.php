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
            'rows.*.page_view' => ['nullable', 'string', 'max:255'],
            'rows.*.redirect' => ['nullable', 'string', 'max:255'],
            'rows.*.submit_form' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'rows.*.account_id.exists' => 'The account_id does not exist.',
            'rows.*.account_id.required' => 'The account_id is required.',
            'rows.*.page_view.string' => 'The page_view must be a string.',
            'rows.*.page_view.max' => 'The page_view must not exceed 255 characters.',
            'rows.*.redirect.string' => 'The redirect must be a string.',
            'rows.*.redirect.max' => 'The redirect must not exceed 255 characters.',
            'rows.*.submit_form.string' => 'The submit_form must be a string.',
            'rows.*.submit_form.max' => 'The submit_form must not exceed 255 characters.',
        ];
    }
}

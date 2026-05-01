<?php

namespace App\Http\Requests\KeywordSet;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKeywordSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'keywords' => ['nullable', 'array'],
            'keywords.*' => ['string', 'max:255'],
        ];
    }
}

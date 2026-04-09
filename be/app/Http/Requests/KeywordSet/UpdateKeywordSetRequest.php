<?php

namespace App\Http\Requests\KeywordSet;

use App\Models\KeywordSet;
use Illuminate\Foundation\Http\FormRequest;

class UpdateKeywordSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $keywordSet = $this->route('keyword_set');

        return $keywordSet instanceof KeywordSet && $this->user()?->can('update', $keywordSet) === true;
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

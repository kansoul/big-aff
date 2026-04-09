<?php

namespace App\Http\Requests\KeywordSet;

use App\Models\KeywordSet;
use Illuminate\Foundation\Http\FormRequest;

class StoreKeywordSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', KeywordSet::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'keywords' => ['nullable', 'array'],
            'keywords.*' => ['string', 'max:255'],
        ];
    }
}

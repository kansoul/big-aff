<?php

namespace App\Http\Requests\Adx\Tracking;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreAdxEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'occurred_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'campaign_id' => ['required', 'string', 'max:191'],
            'source_id' => ['nullable', 'integer', 'exists:adx_links,id'],
            'page_key' => ['nullable', 'string', 'max:50'],
            'event_type' => ['required', 'string', Rule::in(['landing_view', 'get_game_link_click', 'detail_view', 'get_bonus_click'])],
            'gclid' => ['nullable', 'string'],
            'gbraid' => ['nullable', 'string'],
            'wbraid' => ['nullable', 'string'],
            'conversion_value' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'size:3'],
        ];
    }

    public function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
        ], 200));
    }
}

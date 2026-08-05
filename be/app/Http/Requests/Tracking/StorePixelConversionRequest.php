<?php

namespace App\Http\Requests\Tracking;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StorePixelConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tracking_code' => ['required', 'string', 'exists:ads_links,tracking_code'],
            'platform' => ['nullable', 'string', 'in:tiktok,meta'],
            'advertiser_id' => ['nullable', 'string', 'max:255'],
            'pixel_id' => ['nullable', 'string', 'max:255'],
            'event_name' => ['nullable', 'string', 'max:255'],
            'event_id' => ['nullable', 'string', 'max:255'],
            'session_id' => ['nullable', 'string', 'max:255'],
            'campaign_id' => ['nullable', 'string', 'max:255'],
            'adset_id' => ['nullable', 'string', 'max:255'],
            'ad_id' => ['nullable', 'string', 'max:255'],
            'click_id' => ['nullable', 'string', 'max:255'],
            'conversion_value' => ['nullable', 'numeric'],
            'currency_code' => ['nullable', 'string', 'max:50'],
            'payload' => ['nullable', 'array'],
        ];
    }

    public function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
        ], 200));
    }
}

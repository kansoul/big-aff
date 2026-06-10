<?php

namespace App\Http\Requests\Tracking;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreAdsConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_id' => 'required|string|exists:accounts,account_id',
            'campaign_id' => [
                'required',
                'string',
                'exists:link_datas,campaign_id',
            ],
            'gclid' => [
                'nullable',
                'string',
                'required_without_all:wbraid,gbraid',
            ],
            'wbraid' => [
                'nullable',
                'string',
                'required_without_all:gclid,gbraid',
            ],
            'gbraid' => [
                'nullable',
                'string',
                'required_without_all:gclid,wbraid',
            ],
            'session_id' => ['nullable', 'string', 'max:255'],
            'conversion_action_resource_name' => ['required', 'string'],
            'conversion_value' => ['nullable', 'numeric'],
            'currency_code' => ['nullable', 'string'],
        ];
    }

    public function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
        ], 200));
    }
}

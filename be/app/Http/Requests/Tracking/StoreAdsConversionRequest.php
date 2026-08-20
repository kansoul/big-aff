<?php

namespace App\Http\Requests\Tracking;

use App\Enums\AdsConversionType;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

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
            'type' => ['nullable', Rule::enum(AdsConversionType::class)],
            'campaign_id' => [
                'nullable',
                'string',
            ],
            'gclid' => [
                'nullable',
                'string',
                'required_without_all:wbraid,gbraid,ttclid',
            ],
            'wbraid' => [
                'nullable',
                'string',
                'required_without_all:gclid,gbraid,ttclid',
            ],
            'gbraid' => [
                'nullable',
                'string',
                'required_without_all:gclid,wbraid,ttclid',
            ],
            'ttclid' => [
                'nullable',
                'string',
                'required_without_all:gclid,wbraid,gbraid',
            ],
            'session_id' => ['nullable', 'string', 'max:255'],
            'conversion_action_resource_name' => [
                'required',
                Rule::in(['page_view', 'redirect', 'submit_form']),
            ],
            'conversion_value' => ['required', 'numeric', 'min:0'],
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

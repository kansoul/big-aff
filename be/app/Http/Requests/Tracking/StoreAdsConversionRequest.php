<?php

namespace App\Http\Requests\Tracking;

use App\Models\Account;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreAdsConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'ip_address' => $this->ip_address ?: $this->ip(),
            'user_agent' => $this->user_agent ?: $this->userAgent(),
        ]);
    }

    public function rules(): array
    {
        return [
            'campaign_id' => [
                'required',
                'string',
                'exists:link_datas,campaign_id',
            ],
            'account_id' => [
                'required',
                'string',
                'exists:accounts,account_id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $account = Account::where('account_id', $value)->where('roas_enabled', true)->first();

                    if (! $account || ! $account->roas_enabled) {
                        $fail('This account is not enabled for ROAS upload.');
                    }
                },
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
            'ip_address' => ['nullable', 'string', 'max:45'],
            'user_agent' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
        ], 200));
    }
}

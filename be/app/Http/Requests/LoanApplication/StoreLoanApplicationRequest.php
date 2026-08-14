<?php

namespace App\Http\Requests\LoanApplication;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoanApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            ...UpdateLoanApplicationRequest::fieldRules(requiredLoanAmount: true),
            // Only set at creation time: the campaign that brought the visitor in.
            'campaign_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'utm_source' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}

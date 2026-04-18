<?php

namespace App\Http\Requests\AdsReport;

use Illuminate\Foundation\Http\FormRequest;

class GetAdsReportStatsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'ads_type' => ['nullable', 'string', 'in:facebook,google'],
            'account_id' => ['nullable', 'string', 'exists:accounts,account_id'],
            'campaign_ids' => ['nullable', 'array'],
            'campaign_ids.*' => ['string'],
        ];
    }
}

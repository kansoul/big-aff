<?php

namespace App\Http\Requests\AnalyticsTracking;

use Illuminate\Foundation\Http\FormRequest;

class AnalyticsTrackingStatsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'account_id' => ['nullable', 'string', 'exists:accounts,account_id'],
            'campaign_id' => ['nullable', 'string'],
        ];
    }
}

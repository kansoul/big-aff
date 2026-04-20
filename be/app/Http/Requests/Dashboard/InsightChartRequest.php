<?php

namespace App\Http\Requests\Dashboard;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InsightChartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'chart_type' => ['required', Rule::in(['daily_spend', 'weekly_spend', 'monthly_spend', 'daily_revenue', 'weekly_revenue', 'monthly_revenue'])],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'ads_type' => ['nullable', 'string'],
            'account_id' => ['nullable', 'string', 'exists:accounts,account_id'],
        ];
    }
}

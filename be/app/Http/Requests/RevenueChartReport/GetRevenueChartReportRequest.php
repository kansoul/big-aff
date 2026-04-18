<?php

namespace App\Http\Requests\RevenueChartReport;

use App\Actions\RevenueChartReport\GetRevenueChartReportAction;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GetRevenueChartReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'style_codes' => ['nullable', 'array'],
            'style_codes.*' => ['string', 'max:100'],
            'metric' => ['nullable', 'string', Rule::in(GetRevenueChartReportAction::ALLOWED_METRICS)],
        ];
    }
}

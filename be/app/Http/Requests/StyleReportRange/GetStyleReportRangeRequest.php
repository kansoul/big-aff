<?php

namespace App\Http\Requests\StyleReportRange;

use Illuminate\Foundation\Http\FormRequest;

class GetStyleReportRangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ranges' => ['required', 'array', 'min:1'],
            'ranges.*.start_date' => ['required', 'date_format:Y-m-d'],
            'ranges.*.start_time' => ['required', 'date_format:H:i'],
            'ranges.*.end_date' => ['required', 'date_format:Y-m-d'],
            'ranges.*.end_time' => ['required', 'date_format:H:i'],
            'ranges.*.style_codes' => ['required', 'array', 'min:1'],
            'ranges.*.style_codes.*' => ['required', 'string', 'exists:styles,code'],
        ];
    }

    public function messages(): array
    {
        return [
            'ranges.*.start_date.required' => 'Start date is required.',
            'ranges.*.start_date.date_format' => 'Start date must be in Y-m-d format.',
            'ranges.*.start_time.required' => 'Start time is required.',
            'ranges.*.start_time.date_format' => 'Start time must be in H:i format.',
            'ranges.*.end_date.required' => 'End date is required.',
            'ranges.*.end_date.date_format' => 'End date must be in Y-m-d format.',
            'ranges.*.end_time.required' => 'End time is required.',
            'ranges.*.end_time.date_format' => 'End time must be in H:i format.',
            'ranges.*.style_codes.required' => 'Style codes is required.',
            'ranges.*.style_codes.array' => 'Style codes must be an array.',
            'ranges.*.style_codes.min' => 'Style codes must have at least one element.',
            'ranges.*.style_codes.*.required' => 'Style code is required.',
            'ranges.*.style_codes.*.string' => 'Style code must be a string.',
            'ranges.*.style_codes.*.exists' => 'Style code does not exist.',
        ];
    }
}

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
            'ranges.*.channel_codes' => ['required', 'array', 'min:1'],
            'ranges.*.channel_codes.*' => ['required', 'string', 'exists:channels,code'],
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
            'ranges.*.channel_codes.required' => 'Channel codes is required.',
            'ranges.*.channel_codes.array' => 'Channel codes must be an array.',
            'ranges.*.channel_codes.min' => 'Channel codes must have at least one element.',
            'ranges.*.channel_codes.*.required' => 'Channel code is required.',
            'ranges.*.channel_codes.*.string' => 'Channel code must be a string.',
            'ranges.*.channel_codes.*.exists' => 'Channel code does not exist.',
        ];
    }
}

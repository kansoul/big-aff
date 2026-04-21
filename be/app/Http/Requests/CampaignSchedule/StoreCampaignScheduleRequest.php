<?php

namespace App\Http\Requests\CampaignSchedule;

use Illuminate\Foundation\Http\FormRequest;

class StoreCampaignScheduleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'turn_on_time' => ['nullable', 'date_format:H:i'],
            'turn_off_time' => ['nullable', 'date_format:H:i'],
            'is_active' => ['sometimes', 'boolean'],
            'campaign_ids' => ['required', 'array', 'min:1'],
            'campaign_ids.*' => ['required', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (empty($this->input('turn_on_time')) && empty($this->input('turn_off_time'))) {
                $v->errors()->add('turn_on_time', 'You must provide at least a Turn On Time or a Turn Off Time.');
            }
        });
    }
}

<?php

namespace App\Http\Requests\CampaignReport;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ToggleCampaignReportStatusRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => [
                'required',
                'string',
                Rule::in(['ACTIVE', 'PAUSED']),
            ],
        ];
    }
}

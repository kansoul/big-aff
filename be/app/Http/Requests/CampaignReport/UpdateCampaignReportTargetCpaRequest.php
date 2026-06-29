<?php

namespace App\Http\Requests\CampaignReport;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCampaignReportTargetCpaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'target_cpa' => [
                'required',
                'numeric',
                'min:0',
                'max:5',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'target_cpa.max' => 'Target CPA tối đa là $5.',
            'target_cpa.min' => 'Target CPA phải lớn hơn hoặc bằng 0.',
        ];
    }
}

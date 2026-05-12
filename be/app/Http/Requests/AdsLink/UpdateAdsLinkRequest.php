<?php

namespace App\Http\Requests\AdsLink;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateAdsLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rac' => ['nullable', 'string'],
            'channel_code' => ['nullable', 'string'],
            'keyword_set_id' => ['nullable', 'integer', 'exists:keyword_sets,id'],
            'fbid' => ['nullable', 'string'],
            'googleid' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $fbid = $this->input('fbid');
                $googleid = $this->input('googleid');

                if (isset($fbid) || isset($googleid)) {
                    if (empty($fbid) && empty($googleid)) {
                        $validator->errors()->add('fbid', 'At least one of Facebook Pixel ID or Google Account ID is required.');
                    }
                }
            },
        ];
    }
}

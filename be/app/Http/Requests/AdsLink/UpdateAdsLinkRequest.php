<?php

namespace App\Http\Requests\AdsLink;

use App\Models\AdsLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateAdsLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        $adsLink = $this->route('ads_link');

        return $adsLink instanceof AdsLink && $this->user()?->can('update', $adsLink);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rac' => ['nullable', 'string'],
            'fbid' => ['nullable', 'string'],
            'googleid' => ['nullable', 'string'],
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

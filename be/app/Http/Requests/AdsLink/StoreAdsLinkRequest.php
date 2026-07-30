<?php

namespace App\Http\Requests\AdsLink;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAdsLinkRequest extends FormRequest
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
            'site_id' => ['required', 'integer', 'exists:sites,id'],
            'post_id' => ['required', 'integer', 'exists:posts,id'],
            'channel_code' => ['required', 'string', 'exists:channels,code'],
            'rac' => ['required', 'string'],
            'keyword_set_id' => ['nullable', 'integer', 'exists:keyword_sets,id'],
            'note' => ['nullable', 'string'],
            'googleid' => ['nullable', 'string'],
            'tiktokid' => ['nullable', 'string'],
            'tiktok_pixel_id' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $googleid = $this->input('googleid');
                $tiktokid = $this->input('tiktokid');
                $tiktok_pixel_id = $this->input('tiktok_pixel_id');

                if (empty($googleid) && empty($tiktokid)) {
                    $validator->errors()->add('googleid', 'At least one of Google Account ID or TikTok Advertiser ID is required.');
                }

                if (! empty($tiktokid) && empty($tiktok_pixel_id)) {
                    $validator->errors()->add('tiktok_pixel_id', 'TikTok Pixel ID is required when TikTok Advertiser ID is provided.');
                }
            },
        ];
    }
}

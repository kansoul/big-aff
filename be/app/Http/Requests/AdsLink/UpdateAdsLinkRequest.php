<?php

namespace App\Http\Requests\AdsLink;

use App\Models\AdsLink;
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
            'tiktokid' => ['nullable', 'string'],
            'tiktok_pixel_id' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $fbid = $this->input('fbid');
                $googleid = $this->input('googleid');
                $tiktokid = $this->input('tiktokid');
                $tiktok_pixel_id = $this->input('tiktok_pixel_id');

                if (isset($fbid) || isset($googleid) || isset($tiktokid)) {
                    if (empty($fbid) && empty($googleid) && empty($tiktokid)) {
                        $validator->errors()->add('fbid', 'At least one of Facebook Pixel ID, Google Account ID, or TikTok Advertiser ID is required.');
                    }
                }

                $adsLink = $this->route('ads_link');
                $trackingIds = $adsLink instanceof AdsLink ? ($adsLink->tracking_ids ?? []) : [];
                $finalTiktokId = $this->exists('tiktokid')
                    ? $tiktokid
                    : ($trackingIds['tiktokid'] ?? null);
                $finalTiktokPixelId = $this->exists('tiktok_pixel_id')
                    ? $tiktok_pixel_id
                    : ($trackingIds['tiktok_pixel_id'] ?? null);

                if (($this->exists('tiktokid') || $this->exists('tiktok_pixel_id'))
                    && ! empty($finalTiktokId)
                    && empty($finalTiktokPixelId)) {
                    $validator->errors()->add('tiktok_pixel_id', 'TikTok Pixel ID is required when TikTok Advertiser ID is provided.');
                }
            },
        ];
    }
}

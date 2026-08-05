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
            'pixel_id' => ['nullable', 'integer', 'exists:pixels,id'],
            'rac' => ['nullable', 'string'],
            'googleid' => ['nullable', 'string'],
            'tiktokid' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            'postback_url' => ['nullable', 'string', 'max:2048', 'url'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $googleid = $this->input('googleid');
                $tiktokid = $this->input('tiktokid');

                if (isset($googleid) || isset($tiktokid)) {
                    if (empty($googleid) && empty($tiktokid) && ! $this->filled('pixel_id')) {
                        $validator->errors()->add('googleid', 'At least one of Google Account ID or TikTok Advertiser ID is required.');
                    }
                }

                $adsLink = $this->route('ads_link');
                $trackingIds = $adsLink instanceof AdsLink ? ($adsLink->tracking_ids ?? []) : [];
                $finalTiktokId = $this->exists('tiktokid')
                    ? $tiktokid
                    : ($trackingIds['tiktokid'] ?? null);
                $finalPixelId = $this->exists('pixel_id')
                    ? $this->input('pixel_id')
                    : ($adsLink instanceof AdsLink ? $adsLink->pixel_id : null);

                if ($this->exists('tiktokid')
                    && ! empty($finalTiktokId)
                    && empty($finalPixelId)) {
                    $validator->errors()->add('pixel_id', 'Pixel is required when TikTok Advertiser ID is provided.');
                }

                if (! empty($finalPixelId) && empty($finalTiktokId)) {
                    $validator->errors()->add('tiktokid', 'TikTok Advertiser ID is required when a Pixel is selected.');
                }

            },
        ];
    }
}

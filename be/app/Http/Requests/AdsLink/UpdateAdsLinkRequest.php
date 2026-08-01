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
            'account_id' => ['nullable', 'integer', 'exists:accounts,id', 'required_with:pixel_id'],
            'pixel_id' => ['nullable', 'integer', 'exists:pixels,id', 'required_with:account_id'],
            'rac' => ['nullable', 'string'],
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
                $googleid = $this->input('googleid');
                $tiktokid = $this->input('tiktokid');
                $tiktok_pixel_id = $this->input('tiktok_pixel_id');

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
                $finalTiktokPixelId = $this->exists('tiktok_pixel_id')
                    ? $tiktok_pixel_id
                    : ($trackingIds['tiktok_pixel_id'] ?? null);

                if (($this->exists('tiktokid') || $this->exists('tiktok_pixel_id'))
                    && ! empty($finalTiktokId)
                    && empty($finalTiktokPixelId)) {
                    $validator->errors()->add('tiktok_pixel_id', 'TikTok Pixel ID is required when TikTok Advertiser ID is provided.');
                }

                if (! empty($finalTiktokId) && ! empty($finalTiktokPixelId)
                    && count($this->csvValues($finalTiktokId)) !== count($this->csvValues($finalTiktokPixelId))) {
                    $validator->errors()->add('tiktok_pixel_id', 'Each TikTok Advertiser ID must have one corresponding Pixel ID.');
                }
            },
        ];
    }

    /** @return array<int, string> */
    private function csvValues(string|array $value): array
    {
        $values = is_array($value) ? $value : explode(',', $value);

        return array_values(array_filter(array_map('trim', $values)));
    }
}

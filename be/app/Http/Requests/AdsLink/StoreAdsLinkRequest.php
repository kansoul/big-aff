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
            'account_id' => ['nullable', 'integer', 'exists:accounts,id', 'required_with:pixel_id'],
            'pixel_id' => ['nullable', 'integer', 'exists:pixels,id', 'required_with:account_id'],
            'rac' => ['required', 'string'],
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

                if (empty($googleid) && empty($tiktokid) && ! $this->filled('pixel_id')) {
                    $validator->errors()->add('googleid', 'At least one of Google Account ID or TikTok Advertiser ID is required.');
                }

                if (! empty($tiktokid) && empty($tiktok_pixel_id)) {
                    $validator->errors()->add('tiktok_pixel_id', 'TikTok Pixel ID is required when TikTok Advertiser ID is provided.');
                }

                if (! empty($tiktokid) && ! empty($tiktok_pixel_id)
                    && count($this->csvValues($tiktokid)) !== count($this->csvValues($tiktok_pixel_id))) {
                    $validator->errors()->add('tiktok_pixel_id', 'Each TikTok Advertiser ID must have one corresponding Pixel ID.');
                }
            },
        ];
    }

    /** @return array<int, string> */
    private function csvValues(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }
}

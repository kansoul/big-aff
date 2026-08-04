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
            'pixel_id' => ['nullable', 'integer', 'exists:pixels,id'],
            'rac' => ['required', 'string'],
            'note' => ['nullable', 'string'],
            'googleid' => ['nullable', 'string'],
            'tiktokid' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $googleid = $this->input('googleid');
                $tiktokid = $this->input('tiktokid');

                if (empty($googleid) && empty($tiktokid) && ! $this->filled('pixel_id')) {
                    $validator->errors()->add('googleid', 'At least one of Google Account ID or TikTok Advertiser ID is required.');
                }

                if (! empty($tiktokid) && ! $this->filled('pixel_id')) {
                    $validator->errors()->add('pixel_id', 'Pixel is required when TikTok Advertiser ID is provided.');
                }

                if ($this->filled('pixel_id') && empty($tiktokid)) {
                    $validator->errors()->add('tiktokid', 'TikTok Advertiser ID is required when a Pixel is selected.');
                }

            },
        ];
    }
}

<?php

namespace App\Http\Requests\AdsLink;

use App\Models\AdsLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAdsLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', AdsLink::class) ?? false;
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
            'keyword_set_id' => ['nullable', 'integer', 'exists:post_keyword_sets,id'],
            'note' => ['nullable', 'string'],
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

                if (empty($fbid) && empty($googleid)) {
                    $validator->errors()->add('fbid', 'At least one of Facebook Pixel ID or Google Account ID is required.');
                }
            },
        ];
    }
}

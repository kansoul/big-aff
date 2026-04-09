<?php

namespace App\Http\Requests\AdsLink;

use App\Models\AdsLink;
use Illuminate\Foundation\Http\FormRequest;

class ListAdsLinksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', AdsLink::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'keyword' => ['nullable', 'string', 'max:255'],
            'site_id' => ['nullable', 'integer'],
            'channel_code' => ['nullable', 'string'],
            'created_by' => ['nullable', 'integer'],
            'pixel_id' => ['nullable', 'string', 'max:255'],
            'googleid' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'is_hidden' => ['nullable', 'boolean'],
            'post_id' => ['nullable', 'integer'],
        ];
    }
}

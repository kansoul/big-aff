<?php

namespace App\Http\Requests\Follow;

use Illuminate\Foundation\Http\FormRequest;

class StoreFollowRequest extends FormRequest
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
            'email' => ['required', 'email', 'max:255'],
            'post_id' => ['nullable', 'integer', 'exists:posts,id'],
            'site_id' => ['required', 'integer', 'exists:sites,id'],
            'ads_link_id' => ['nullable', 'integer', 'exists:ads_links,id'],
            'style_code' => ['nullable', 'string', 'max:100'],
            'channel_code' => ['nullable', 'string', 'max:100'],
        ];
    }
}

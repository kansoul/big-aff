<?php

namespace App\Http\Requests\Site;

use App\Enums\SiteStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'url' => ['required', 'string', 'url', 'max:255', 'unique:sites,url'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', Rule::in(SiteStatus::values())],
            'settings' => ['nullable', 'array'],
            'settings.gtm' => ['nullable', 'string', 'max:255'],
            'settings.theme' => ['nullable', 'string', 'max:255'],
            'settings.default_channel' => ['required', 'string', 'exists:channels,code'],
            'settings.default_style' => ['required', 'string', 'exists:styles,code'],

            'logo_id' => ['nullable', 'integer', 'exists:files,id'],

            'favicon_id' => ['nullable', 'integer', 'exists:files,id'],
        ];
    }
}

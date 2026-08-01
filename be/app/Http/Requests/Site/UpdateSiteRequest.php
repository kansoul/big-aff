<?php

namespace App\Http\Requests\Site;

use App\Enums\SiteStatus;
use App\Models\Site;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSiteRequest extends FormRequest
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
        /** @var Site $site */
        $site = $this->route('site');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'url' => ['sometimes', 'string', 'url', 'max:255', Rule::unique('sites', 'url')->ignore($site->id)],
            'description' => ['nullable', 'string'],
            'settings' => ['nullable', 'array'],
            'status' => ['sometimes', 'string', Rule::in(SiteStatus::values())],
            'settings.gtm' => ['nullable', 'string', 'max:255'],
            'settings.theme' => ['nullable', 'string', 'max:255'],
            'logo_id' => ['sometimes', 'nullable', 'integer', 'exists:files,id'],
            'favicon_id' => ['sometimes', 'nullable', 'integer', 'exists:files,id'],
        ];
    }
}

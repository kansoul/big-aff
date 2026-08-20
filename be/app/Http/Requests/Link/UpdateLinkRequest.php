<?php

namespace App\Http\Requests\Link;

use App\Enums\LinkStatus;
use App\Models\Link;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Link $link */
        $link = $this->route('link');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'url' => ['sometimes', 'url:http,https', 'max:2048', Rule::unique('links', 'url')->ignore($link)],
            'status' => ['sometimes', 'string', Rule::in(LinkStatus::values())],
        ];
    }
}

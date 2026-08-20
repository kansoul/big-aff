<?php

namespace App\Http\Requests\Link;

use App\Enums\LinkStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'url' => ['required', 'url:http,https', 'max:2048', 'unique:links,url'],
            'status' => ['nullable', 'string', Rule::in(LinkStatus::values())],
        ];
    }
}

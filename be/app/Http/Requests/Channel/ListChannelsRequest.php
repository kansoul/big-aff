<?php

namespace App\Http\Requests\Channel;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;

class ListChannelsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionFlag(Permission::ChannelsView) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'query' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}

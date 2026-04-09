<?php

namespace App\Http\Requests\Style;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;

class ListStylesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionFlag(Permission::StylesView) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'query' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}

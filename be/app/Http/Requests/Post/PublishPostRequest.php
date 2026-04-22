<?php

namespace App\Http\Requests\Post;

use App\Enums\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PublishPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionFlag(Permission::PostsPublish);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'publish' => ['required', 'boolean'],
        ];
    }
}

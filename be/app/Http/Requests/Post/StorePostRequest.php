<?php

namespace App\Http\Requests\Post;

use App\Enums\PostStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:posts,slug'],
            'lang' => ['nullable', 'string', 'max:10'],
            'description' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'feature_media_id' => ['nullable', 'integer', 'exists:files,id'],
            'status' => ['nullable', 'string', Rule::in(PostStatus::values())],
            'is_hidden' => ['nullable', 'boolean'],
            'type' => ['nullable', 'string', 'max:50'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'published_at' => ['nullable', 'date'],
        ];
    }
}

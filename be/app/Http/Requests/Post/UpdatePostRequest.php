<?php

namespace App\Http\Requests\Post;

use App\Enums\PostStatus;
use App\Enums\PostType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePostRequest extends FormRequest
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
        $postId = $this->route('post')?->id;

        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('posts', 'slug')->ignore($postId)],
            'lang' => ['sometimes', 'nullable', 'string', 'max:10'],
            'note' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'content' => ['sometimes', 'nullable', 'string'],
            'feature_media_id' => ['sometimes', 'nullable', 'integer', 'exists:files,id'],
            'status' => ['sometimes', 'string', Rule::in(PostStatus::values())],
            'is_hidden' => ['sometimes', 'boolean'],
            'type' => ['sometimes', 'nullable', 'string', Rule::in(PostType::values())],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'published_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}

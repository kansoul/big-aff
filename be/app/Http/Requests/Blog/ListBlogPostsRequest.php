<?php

namespace App\Http\Requests\Blog;

use Illuminate\Foundation\Http\FormRequest;

class ListBlogPostsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
            'page' => ['nullable', 'integer', 'min:1'],
            'category_slug' => ['nullable', 'string', 'max:255'],
        ];
    }
}

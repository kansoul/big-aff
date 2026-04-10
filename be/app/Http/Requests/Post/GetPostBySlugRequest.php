<?php

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class GetPostBySlugRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'campaign_id' => ['nullable', 'string', 'max:255'],
            'tt' => ['nullable', 'string', 'max:5'],
        ];
    }
}

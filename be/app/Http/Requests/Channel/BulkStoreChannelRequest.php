<?php

namespace App\Http\Requests\Channel;

use App\Models\Channel;
use Illuminate\Foundation\Http\FormRequest;

class BulkStoreChannelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Channel::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'lines' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lines.required' => 'Please provide at least one line in the format: channel_name|channel_code',
        ];
    }
}

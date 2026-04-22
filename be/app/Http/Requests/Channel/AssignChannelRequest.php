<?php

namespace App\Http\Requests\Channel;

use Illuminate\Foundation\Http\FormRequest;

class AssignChannelRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'channel_codes' => ['present', 'array'],
            'channel_codes.*' => ['required', 'string', 'exists:channels,code'],
        ];
    }
}

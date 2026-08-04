<?php

namespace App\Http\Requests\Pixel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePixelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pixel_id' => ['required', 'string', 'max:255', Rule::unique('pixels', 'pixel_id')->ignore($this->route('pixel'))],
            'name' => ['nullable', 'string', 'max:255'],
        ];
    }
}

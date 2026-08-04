<?php

namespace App\Http\Requests\Option;

use Illuminate\Foundation\Http\FormRequest;

class PixelOptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [];
    }
}

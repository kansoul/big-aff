<?php

namespace App\Http\Requests\Pixel;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePixelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_id' => ['required', 'integer', Rule::exists('accounts', 'id')->where('ads_type', 'tiktok')],
            'pixel_id' => ['required', 'string', 'max:255', Rule::unique('pixels')->where(fn ($query) => $query->where('account_id', $this->integer('account_id')))],
            'name' => ['nullable', 'string', 'max:255'],
        ];
    }
}

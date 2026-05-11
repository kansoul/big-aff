<?php

namespace App\Http\Requests\Adx\Link;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdxLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'adx_game_id' => ['sometimes', 'required', 'integer', 'exists:adx_games,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'alpha_dash', Rule::unique('adx_links', 'slug')->ignore($this->route('adxLink'))],
            'source' => ['sometimes', 'required', 'string', 'max:50'],
            'landing_url' => ['sometimes', 'required', 'string'],
            'url_template' => ['nullable', 'string'],
            'status' => ['sometimes', 'required', 'string', 'max:50'],
        ];
    }
}

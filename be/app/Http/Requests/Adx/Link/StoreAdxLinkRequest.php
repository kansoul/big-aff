<?php

namespace App\Http\Requests\Adx\Link;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdxLinkRequest extends FormRequest
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
            'adx_game_id' => ['required', 'integer', 'exists:adx_games,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', Rule::unique('adx_links', 'slug')],
            'source' => ['required', 'string', 'max:50'],
            'landing_url' => ['required', 'string'],
            'url_template' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

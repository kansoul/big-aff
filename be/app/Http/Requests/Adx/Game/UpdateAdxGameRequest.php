<?php

namespace App\Http\Requests\Adx\Game;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdxGameRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'alpha_dash', Rule::unique('adx_games', 'slug')->ignore($this->route('adxGame'))],
            'thumbnail' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'game_url' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

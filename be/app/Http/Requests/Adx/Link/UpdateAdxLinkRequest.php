<?php

namespace App\Http\Requests\Adx\Link;

use Illuminate\Foundation\Http\FormRequest;

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
            'landing_url' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'required', 'string', 'max:50'],
        ];
    }
}

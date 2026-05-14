<?php

namespace App\Http\Requests\Adx\Link;

use Illuminate\Foundation\Http\FormRequest;

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
            'landing_url' => ['required', 'string'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

<?php

namespace App\Http\Requests\Adx\Game;

use Illuminate\Foundation\Http\FormRequest;

class AssignAdxGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'game_ids' => ['present', 'array'],
            'game_ids.*' => ['required', 'integer', 'distinct', 'exists:adx_games,id'],
        ];
    }
}

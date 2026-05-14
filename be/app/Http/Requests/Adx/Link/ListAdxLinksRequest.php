<?php

namespace App\Http\Requests\Adx\Link;

use App\Actions\Adx\Link\ListAdxLinksAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdxLinksRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

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
            ...$this->paginationRules(),
            ...$this->sortRules(ListAdxLinksAction::ORDERABLE_COLUMNS),
            'keyword' => ['nullable', 'string', 'max:255'],
            'adx_game_id' => ['nullable', 'integer', 'exists:adx_games,id'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

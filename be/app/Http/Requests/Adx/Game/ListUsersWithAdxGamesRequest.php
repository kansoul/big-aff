<?php

namespace App\Http\Requests\Adx\Game;

use App\Actions\Adx\Game\ListUsersWithAdxGamesAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersWithAdxGamesRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListUsersWithAdxGamesAction::ORDERABLE_COLUMNS),
            [
                'query' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
        );
    }
}

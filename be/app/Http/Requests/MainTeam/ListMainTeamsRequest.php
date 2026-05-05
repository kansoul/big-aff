<?php

namespace App\Http\Requests\MainTeam;

use App\Actions\MainTeam\ListMainTeamsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListMainTeamsRequest extends FormRequest
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
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListMainTeamsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
            ],
        );
    }
}

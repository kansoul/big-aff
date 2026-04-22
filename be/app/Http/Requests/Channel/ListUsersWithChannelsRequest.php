<?php

namespace App\Http\Requests\Channel;

use App\Actions\Channel\ListUsersWithChannelsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersWithChannelsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListUsersWithChannelsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
        );
    }
}

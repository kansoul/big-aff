<?php

namespace App\Http\Requests\Account;

use App\Actions\Account\ListUsersWithAccountsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersWithAccountsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListUsersWithAccountsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
        );
    }
}

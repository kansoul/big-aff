<?php

namespace App\Http\Requests\Adx\Account;

use App\Actions\Adx\Account\ListUsersWithAdxAccountsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersWithAdxAccountsRequest extends FormRequest
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
            $this->sortRules(ListUsersWithAdxAccountsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
        );
    }
}

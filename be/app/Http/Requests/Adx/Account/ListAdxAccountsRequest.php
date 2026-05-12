<?php

namespace App\Http\Requests\Adx\Account;

use App\Actions\Adx\Account\ListAdxAccountsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAdxAccountsRequest extends FormRequest
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
            $this->sortRules(ListAdxAccountsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
                'source' => ['nullable', 'string', Rule::in(['google', 'facebook', 'native', 'other'])],
                'business_center_id' => ['nullable', 'integer', 'exists:business_centers,id'],
                'team_id' => ['nullable', 'integer', 'exists:teams,id'],
                'status' => ['nullable', 'string', 'max:50'],
            ],
        );
    }
}

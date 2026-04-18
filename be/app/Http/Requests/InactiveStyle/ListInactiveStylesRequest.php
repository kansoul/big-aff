<?php

namespace App\Http\Requests\InactiveStyle;

use App\Actions\InactiveStyle\ListInactiveStylesAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ListInactiveStylesRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListInactiveStylesAction::ORDERABLE_COLUMNS),
            [
                'manager_id' => ['nullable', 'integer', 'exists:users,id'],
                'query' => ['nullable', 'string', 'max:255'],
            ],
        );
    }
}

<?php

namespace App\Http\Requests\User;

use App\Actions\User\ListParentChildAssignmentsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use App\Support\PaginationInput\PaginationInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ListParentChildAssignmentsRequest extends FormRequest
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
            $this->sortRules(ListParentChildAssignmentsAction::ORDERABLE_COLUMNS),
            [
                'options_page' => ['nullable', 'integer', 'min:1'],
                'options_per_page' => ['nullable', 'integer', 'min:1', 'max:'.PaginationInput::MAX_PER_PAGE],
            ],
        );
    }
}

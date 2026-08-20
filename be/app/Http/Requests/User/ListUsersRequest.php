<?php

namespace App\Http\Requests\User;

use App\Actions\User\ListUsersAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListUsersRequest extends FormRequest
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
            $this->sortRules(ListUsersAction::ORDERABLE_COLUMNS),
            [
                'keyword' => ['nullable', 'string', 'max:255'],
                'role_id' => ['nullable', 'integer', 'min:1', Rule::exists('roles', 'id')->withoutTrashed()],
            ],
        );
    }

    protected function prepareForValidation(): void
    {
        $keyword = trim((string) $this->input('keyword', ''));

        $this->merge(['keyword' => $keyword !== '' ? $keyword : null]);
    }
}

<?php

namespace App\Http\Requests\File;

use App\Actions\File\ListFilesAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ListFilesRequest extends FormRequest
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
            $this->sortRules(ListFilesAction::ORDERABLE_COLUMNS),
            [
                'alt_text' => ['nullable', 'string', 'max:255'],
                'user_id' => ['nullable', 'integer', 'exists:users,id'],
                'created_from' => ['nullable', 'date'],
                'created_to' => ['nullable', 'date', 'after:created_from'],
            ],
        );
    }
}

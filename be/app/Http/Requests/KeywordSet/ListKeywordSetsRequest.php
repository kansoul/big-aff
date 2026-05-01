<?php

namespace App\Http\Requests\KeywordSet;

use App\Actions\KeywordSet\ListKeywordSetsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListKeywordSetsRequest extends FormRequest
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
            $this->sortRules(ListKeywordSetsAction::ORDERABLE_COLUMNS),
            [
                'keyword' => ['nullable', 'string', 'max:255'],
            ],
        );
    }
}

<?php

namespace App\Http\Requests\Link;

use App\Actions\Link\ListLinksAction;
use App\Enums\LinkStatus;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListLinksRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge($this->paginationRules(), $this->sortRules(ListLinksAction::ORDERABLE_COLUMNS), [
            'keyword' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in(LinkStatus::values())],
        ]);
    }
}

<?php

namespace App\Http\Requests\Pixel;

use App\Actions\Pixel\ListPixelsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListPixelsRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListPixelsAction::ORDERABLE_COLUMNS),
            ['query' => ['nullable', 'string', 'max:255'], 'account_id' => ['nullable', 'integer']],
        );
    }
}

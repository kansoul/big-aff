<?php

namespace App\Http\Requests\Site;

use App\Actions\Site\ListSitesAction;
use App\Enums\SiteStatus;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListSitesRequest extends FormRequest
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
            $this->sortRules(ListSitesAction::ORDERABLE_COLUMNS),
            [
                'keyword' => ['nullable', 'string', 'max:255'],
                'status' => ['nullable', 'string', Rule::in(SiteStatus::values())],
            ],
        );
    }
}

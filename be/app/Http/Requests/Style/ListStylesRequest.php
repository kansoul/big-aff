<?php

namespace App\Http\Requests\Style;

use App\Actions\Style\ListStylesAction;
use App\Enums\Permission;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListStylesRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function authorize(): bool
    {
        return $this->user()?->hasPermissionFlag(Permission::StylesView) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListStylesAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
            ],
        );
    }
}

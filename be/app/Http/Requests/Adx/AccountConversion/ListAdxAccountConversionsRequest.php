<?php

namespace App\Http\Requests\Adx\AccountConversion;

use App\Actions\Adx\AccountConversion\ListAdxAccountConversionsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdxAccountConversionsRequest extends FormRequest
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
        return [
            ...$this->paginationRules(),
            ...$this->sortRules(ListAdxAccountConversionsAction::ORDERABLE_COLUMNS),
            'source' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'string', 'max:191'],
            'conversion_type' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

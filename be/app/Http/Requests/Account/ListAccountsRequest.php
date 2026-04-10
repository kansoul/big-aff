<?php

namespace App\Http\Requests\Account;

use App\Actions\Account\ListAccountsAction;
use App\Enums\AdsType;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAccountsRequest extends FormRequest
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
            $this->sortRules(ListAccountsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
                'ads_type' => ['nullable', 'string', Rule::in(AdsType::values())],
                'business_center_id' => ['nullable', 'integer', 'exists:business_centers,id'],
                'team_id' => ['nullable', 'integer', 'exists:teams,id'],
                'status' => ['nullable', 'string', 'max:50'],
            ],
        );
    }
}

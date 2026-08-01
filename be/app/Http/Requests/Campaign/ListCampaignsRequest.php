<?php

namespace App\Http\Requests\Campaign;

use App\Actions\Campaign\ListCampaignSelectorAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListCampaignsRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

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
            $this->sortRules(ListCampaignSelectorAction::ORDERABLE_COLUMNS),
            [
                'account_id' => ['sometimes', 'string'],
                'user_id' => ['sometimes', 'integer', 'exists:users,id'],
                'status' => ['sometimes', 'string'],
                'search' => ['sometimes', 'string', 'max:255'],
                'min_spend' => ['sometimes', 'numeric', 'min:0'],
                'min_revenue' => ['sometimes', 'numeric', 'min:0'],
                'min_profit' => ['sometimes', 'numeric'],
            ],
        );
    }
}

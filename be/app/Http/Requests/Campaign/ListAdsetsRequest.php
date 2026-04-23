<?php

namespace App\Http\Requests\Campaign;

use App\Actions\Campaign\ListAdsetSelectorAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdsetsRequest extends FormRequest
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
            $this->sortRules(ListAdsetSelectorAction::ORDERABLE_COLUMNS),
            [
                'campaign_id' => ['sometimes', 'string'],
                'account_id' => ['sometimes', 'string'],
                'search' => ['sometimes', 'string', 'max:255'],
                'date_start_from' => ['sometimes', 'date'],
                'date_start_to' => ['sometimes', 'date'],
                'min_spend' => ['sometimes', 'numeric', 'min:0'],
                'max_cpa' => ['sometimes', 'numeric', 'min:0'],
            ],
        );
    }
}

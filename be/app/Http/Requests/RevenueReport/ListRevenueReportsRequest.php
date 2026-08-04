<?php

namespace App\Http\Requests\RevenueReport;

use App\Actions\RevenueReport\ListRevenueReportsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ListRevenueReportsRequest extends FormRequest
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
            $this->sortRules(ListRevenueReportsAction::ORDERABLE_COLUMNS),
            [
                'date_from' => ['nullable', 'date'],
                'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
                'campaign_ids' => ['nullable', 'array'],
                'campaign_ids.*' => ['string', 'max:255'],
            ],
        );
    }
}

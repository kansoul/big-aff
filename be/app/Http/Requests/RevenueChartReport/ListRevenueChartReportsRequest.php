<?php

namespace App\Http\Requests\RevenueChartReport;

use App\Actions\RevenueChartReport\ListRevenueChartReportsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListRevenueChartReportsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListRevenueChartReportsAction::ORDERABLE_COLUMNS),
            [
                'date_from' => ['nullable', 'date_format:Y-m-d'],
                'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
                'interval' => ['nullable', 'in:5m,15m,30m,1,2,3,4,6,12,24'],
                'style_codes' => ['nullable', 'array'],
                'style_codes.*' => ['string'],
            ],
        );
    }
}

<?php

namespace App\Http\Requests\AnalyticsTracking;

use App\Actions\AnalyticsTracking\ListKeywordTrackingAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListKeywordTrackingRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListKeywordTrackingAction::ORDERABLE_COLUMNS),
            [
                'keyword' => ['nullable', 'string', 'max:255'],
                'date_from' => ['nullable', 'date'],
                'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
                'account_id' => ['nullable', 'string', 'exists:accounts,account_id'],
                'campaign_id' => ['nullable', 'string'],
            ],
        );
    }
}

<?php

namespace App\Http\Requests\CampaignSchedule;

use App\Actions\CampaignSchedule\ListCampaignSchedulesAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListCampaignSchedulesRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListCampaignSchedulesAction::ORDERABLE_COLUMNS),
            [
                'name' => ['nullable', 'string', 'max:255'],
                'campaign_id' => ['nullable', 'string', 'max:255'],
                'is_active' => ['nullable', 'boolean'],
                'created_by' => ['nullable', 'integer', 'exists:users,id'],
            ],
        );
    }
}

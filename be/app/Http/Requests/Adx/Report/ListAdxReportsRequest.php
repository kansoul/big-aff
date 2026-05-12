<?php

namespace App\Http\Requests\Adx\Report;

use App\Actions\Adx\Report\ListAdxCampaignReportsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdxReportsRequest extends FormRequest
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
            ...$this->paginationRules(200),
            ...$this->sortRules(ListAdxCampaignReportsAction::ORDERABLE_COLUMNS),
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'source' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'string', 'max:191'],
            'campaign_id' => ['nullable', 'string', 'max:191'],
            'adx_link_data_id' => ['nullable', 'integer'],
            'adx_link_id' => ['nullable', 'integer'],
            'adx_game_id' => ['nullable', 'integer'],
        ];
    }
}

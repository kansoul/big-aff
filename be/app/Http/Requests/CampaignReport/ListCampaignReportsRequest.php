<?php

namespace App\Http\Requests\CampaignReport;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListCampaignReportsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    /**
     * Valid group_by values (empty string / missing = no grouping).
     *
     * @var array<int, string>
     */
    public const GROUP_BY_COLUMNS = [
        'channel_code',
        'account_id',
        'user_id',
        'campaign_id',
    ];

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
            $this->paginationRules(1000000),
            $this->sortRules(ListCampaignReportsAction::ORDERABLE_COLUMNS),
            [
                'date_from' => ['nullable', 'date'],
                'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
                'user_ids' => ['nullable', 'array'],
                'user_ids.*' => ['integer'],
                'account_ids' => ['nullable', 'array'],
                'account_ids.*' => ['string', 'max:255'],
                'ads_type' => ['nullable', 'string', Rule::in(['facebook', 'google'])],
                'campaign_ids' => ['nullable', 'array'],
                'campaign_ids.*' => ['string', 'max:255'],
                'channel_codes' => ['nullable', 'array'],
                'channel_codes.*' => ['string', 'max:100'],
                'link_data_ids' => ['nullable', 'array'],
                'link_data_ids.*' => ['integer'],
                'group_by' => ['nullable', 'string', Rule::in(self::GROUP_BY_COLUMNS)],
            ],
        );
    }
}

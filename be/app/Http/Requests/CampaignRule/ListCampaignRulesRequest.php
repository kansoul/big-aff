<?php

namespace App\Http\Requests\CampaignRule;

use App\Actions\CampaignRule\ListCampaignRulesAction;
use App\Enums\EntityTypeEnum;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListCampaignRulesRequest extends FormRequest
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
            $this->sortRules(ListCampaignRulesAction::ORDERABLE_COLUMNS),
            [
                'entity_type' => ['sometimes', Rule::enum(EntityTypeEnum::class)],
                'is_active' => ['sometimes', 'boolean'],
            ],
        );
    }
}

<?php

namespace App\Http\Requests\Adx\LinkData;

use App\Actions\Adx\LinkData\ListAdxCampaignsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdxCampaignsRequest extends FormRequest
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
            ...$this->paginationRules(),
            ...$this->sortRules(ListAdxCampaignsAction::ORDERABLE_COLUMNS),
            'keyword' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:50'],
            'adx_account_id' => ['nullable', 'string', 'max:191', 'exists:adx_accounts,account_id'],
            'account_id' => ['nullable', 'string', 'max:191'],
            'campaign_id' => ['nullable', 'string', 'max:191'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}

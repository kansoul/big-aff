<?php

namespace App\Http\Requests\AdsLink;

use App\Actions\AdsLink\ListAdsLinksAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListAdsLinksRequest extends FormRequest
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
            ...$this->sortRules(ListAdsLinksAction::ORDERABLE_COLUMNS),
            'keyword' => ['nullable', 'string', 'max:255'],
            'site_id' => ['nullable', 'integer'],
            'channel_code' => ['nullable', 'string'],
            'created_by' => ['nullable', 'integer'],
            'pixel_id' => ['nullable', 'string', 'max:255'],
            'googleid' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
            'url' => ['nullable', 'string', 'max:2048'],
            'date_range.from' => ['nullable', 'date'],
            'date_range.to' => ['nullable', 'date'],
            'is_hidden' => ['nullable', 'boolean'],
            'post_id' => ['nullable', 'integer'],
        ];
    }
}

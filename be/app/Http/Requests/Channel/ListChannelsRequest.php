<?php

namespace App\Http\Requests\Channel;

use App\Actions\Channel\ListChannelsAction;
use App\Enums\Permission;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListChannelsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function authorize(): bool
    {
        return $this->user()?->hasPermissionFlag(Permission::ChannelsView) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListChannelsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
                'is_active' => ['nullable', 'boolean'],
            ],
        );
    }
}

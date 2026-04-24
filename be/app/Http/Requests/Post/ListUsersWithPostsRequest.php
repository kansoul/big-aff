<?php

namespace App\Http\Requests\Post;

use App\Actions\Post\ListUsersWithPostsAction;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersWithPostsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListUsersWithPostsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
        );
    }
}

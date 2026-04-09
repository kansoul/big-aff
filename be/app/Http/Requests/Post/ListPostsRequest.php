<?php

namespace App\Http\Requests\Post;

use App\Actions\Post\ListPostsAction;
use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPostsRequest extends FormRequest
{
    use ValidatesPaginationQuery;
    use ValidatesSortQuery;

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
            $this->paginationRules(),
            $this->sortRules(ListPostsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
                'status' => ['nullable', 'string', Rule::in(PostStatus::values())],
                'type' => ['nullable', 'string', Rule::in(PostType::values())],
                'lang' => ['nullable', 'string', 'max:10'],
                'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            ],
        );
    }
}

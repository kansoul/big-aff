<?php

namespace App\Http\Requests\Concerns;

use App\Support\PaginationInput\PaginationInput;
use Illuminate\Contracts\Validation\ValidationRule;

trait ValidatesPaginationQuery
{
    /**
     * Merge into {@see FormRequest::rules()} for list endpoints: `page`, `per_page`.
     *
     * @return array<string, array<int, string|ValidationRule>>
     */
    protected function paginationRules(?int $maxPerPage = null): array
    {
        $max = $maxPerPage ?? PaginationInput::MAX_PER_PAGE;

        return [
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.$max],
        ];
    }
}

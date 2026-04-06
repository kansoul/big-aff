<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ValidatesSortQuery
{
    /**
     * Whitelist-based sort query params for list endpoints (`order_by`, `order`).
     *
     * @param  array<int, string>  $allowedColumns
     * @return array<string, array<int, string|ValidationRule>>
     */
    protected function sortRules(array $allowedColumns): array
    {
        return [
            'order_by' => ['nullable', 'string', Rule::in($allowedColumns)],
            'order' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        ];
    }
}

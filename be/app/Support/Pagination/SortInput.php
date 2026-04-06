<?php

namespace App\Support\Pagination;

use Illuminate\Database\Eloquent\Builder;

/**
 * Parsed `order_by` / `order` from a validated list payload (query string).
 */
final readonly class SortInput
{
    public function __construct(
        public string $column,
        public string $direction,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<int, string>  $allowedColumns
     */
    public static function fromValidatedArray(
        array $payload,
        array $allowedColumns,
        string $defaultColumn,
        string $defaultDirection = 'desc',
    ): self {
        $column = $payload['order_by'] ?? $defaultColumn;
        if (! in_array($column, $allowedColumns, true)) {
            $column = $defaultColumn;
        }

        $direction = isset($payload['order']) && is_string($payload['order'])
            ? strtolower($payload['order'])
            : $defaultDirection;
        if (! in_array($direction, ['asc', 'desc'], true)) {
            $direction = $defaultDirection;
        }

        return new self($column, $direction);
    }

    /**
     * Apply ordering; adds a stable secondary sort by `id` when the primary column is not `id`.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     */
    public function applyTo(Builder $query): void
    {
        $query->orderBy($this->column, $this->direction);
        if ($this->column !== 'id') {
            $query->orderBy('id', $this->direction);
        }
    }
}

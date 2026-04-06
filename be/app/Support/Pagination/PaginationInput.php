<?php

namespace App\Support\Pagination;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Parsed `page` / `per_page` from a validated list payload (query string).
 */
final readonly class PaginationInput
{
    public const DEFAULT_PER_PAGE = 15;

    public const MAX_PER_PAGE = 100;

    public function __construct(
        public int $perPage,
        public ?int $page,
    ) {}

    /**
     * Build from `$request->validated()` (or any array that may include `page`, `per_page`).
     *
     * @param  array<string, mixed>  $payload
     */
    public static function fromValidatedArray(array $payload, ?int $defaultPerPage = null): self
    {
        $default = $defaultPerPage ?? self::DEFAULT_PER_PAGE;

        return new self(
            perPage: (int) ($payload['per_page'] ?? $default),
            page: isset($payload['page']) ? (int) $payload['page'] : null,
        );
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     */
    public function paginateQuery(Builder $query): LengthAwarePaginator
    {
        return $query->paginate(
            perPage: $this->perPage,
            pageName: 'page',
            page: $this->page,
        );
    }
}

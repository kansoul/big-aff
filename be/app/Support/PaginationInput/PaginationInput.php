<?php

namespace App\Support\PaginationInput;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
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
     * Use `$prefix` for option lists, e.g. `options_` reads `options_page` and `options_per_page`.
     *
     * @param  array<string, mixed>  $payload
     */
    public static function fromValidatedArray(array $payload, ?int $defaultPerPage = null, string $prefix = ''): self
    {
        $default = $defaultPerPage ?? self::DEFAULT_PER_PAGE;
        $pageKey = $prefix.'page';
        $perPageKey = $prefix.'per_page';

        return new self(
            perPage: (int) ($payload[$perPageKey] ?? $default),
            page: isset($payload[$pageKey]) ? (int) $payload[$pageKey] : null,
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

    /**
     * Simple pagination (no total count) — for option/dropdown lists.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     */
    public function simplePaginateQuery(Builder $query, string $pageName = 'page'): Paginator
    {
        return $query->simplePaginate(
            perPage: $this->perPage,
            pageName: $pageName,
            page: $this->page,
        );
    }
}

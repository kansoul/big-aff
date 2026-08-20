<?php

namespace App\Actions\Link;

use App\Models\Link;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListLinksAction
{
    public const ORDERABLE_COLUMNS = ['id', 'name', 'url', 'status', 'created_at', 'updated_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Link::query();
        $query->when($filters['keyword'] ?? null, fn ($q, $keyword) => $q->where(fn ($inner) => $inner->where('name', 'like', "%{$keyword}%")->orWhere('url', 'like', "%{$keyword}%")))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, defaultColumn: 'id', defaultDirection: 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

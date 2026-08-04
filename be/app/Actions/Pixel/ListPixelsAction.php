<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListPixelsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'pixel_id', 'name', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Pixel::query();
        OwnershipFilter::forAuthUser()->applyTo($query);
        $query->when($filters['query'] ?? null, fn ($q, $value) => $q->where(fn ($inner) => $inner->where('pixel_id', 'like', "%{$value}%")->orWhere('name', 'like', "%{$value}%")));
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, defaultColumn: 'id', defaultDirection: 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

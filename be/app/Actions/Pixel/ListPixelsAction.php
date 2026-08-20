<?php

namespace App\Actions\Pixel;

use App\Models\Pixel;
use App\Support\OwnerResource\PixelOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListPixelsAction
{
    public const ORDERABLE_COLUMNS = ['id', 'pixel_id', 'name', 'platform', 'business_center_id', 'status', 'created_at'];

    public function execute(array $filters): LengthAwarePaginator
    {
        $query = Pixel::query()->with('businessCenter:id,bc_id,name,ads_type');
        (new PixelOwnerResource)->applyTo($query);
        $query
            ->when($filters['query'] ?? null, fn ($q, $value) => $q->where(fn ($inner) => $inner
                ->where('pixel_id', 'like', "%{$value}%")
                ->orWhere('name', 'like', "%{$value}%")
                ->orWhereHas('businessCenter', fn ($businessCenter) => $businessCenter->where('name', 'like', "%{$value}%"))))
            ->when($filters['platform'] ?? null, fn ($q, $value) => $q->where('platform', $value))
            ->when($filters['business_center_id'] ?? null, fn ($q, $value) => $q->where('business_center_id', $value))
            ->when($filters['status'] ?? null, fn ($q, $value) => $q->where('status', $value));
        SortInput::fromValidatedArray($filters, self::ORDERABLE_COLUMNS, defaultColumn: 'id', defaultDirection: 'desc')->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

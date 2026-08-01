<?php

namespace App\Actions\AdsLink;

use App\Models\AdsLink;
use App\Support\OwnerResource\AdsLinkOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAdsLinksAction
{
    public const ORDERABLE_COLUMNS = [
        'id',
        'slug',
        'site_id',
        'is_hidden',
        'note',
        'created_by',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = AdsLink::query()
            ->with('site');

        (new AdsLinkOwnerResource)->applyTo($query);

        $query
            ->when(! empty($filters['keyword']), function ($q) use ($filters): void {
                $q->where(function ($inner) use ($filters): void {
                    $inner->where('slug', 'like', '%'.$filters['keyword'].'%');
                });
            })
            ->when(! empty($filters['site_id']), fn ($q) => $q->where('site_id', $filters['site_id']))
            ->when(! empty($filters['created_by']), fn ($q) => $q->where('created_by', $filters['created_by']))
            ->when(! empty($filters['googleid']), function ($q) use ($filters) {
                return $q->where('tracking_ids->googleid', 'LIKE', '%'.$filters['googleid'].'%');
            })
            ->when(! empty($filters['tiktokid']), function ($q) use ($filters) {
                return $q->where('tracking_ids->tiktokid', 'LIKE', '%'.$filters['tiktokid'].'%');
            })
            ->when(! empty($filters['note']), fn ($q) => $q->where('note', 'LIKE', '%'.$filters['note'].'%'))
            ->when(! empty($filters['url']), function ($q) use ($filters): void {
                $raw = $filters['url'];
                $parsed = parse_url(str_starts_with($raw, 'http') ? $raw : 'https://'.$raw);
                $domain = $parsed['host'] ?? null;
                $pathSlug = $parsed['path'] ?? null;
                if ($pathSlug) {
                    $pathSlug = basename(rtrim($pathSlug, '/')) ?: null;
                }

                if ($domain && $pathSlug) {
                    $q->where('slug', 'LIKE', '%'.$pathSlug.'%')
                        ->whereHas('site', fn ($s) => $s->where('url', 'LIKE', '%'.$domain.'%'));
                } else {
                    $q->where(function ($inner) use ($raw, $domain): void {
                        $inner->where('slug', 'LIKE', '%'.$raw.'%')
                            ->orWhereHas('site', fn ($s) => $s->where('url', 'LIKE', '%'.$domain.'%'));
                    });
                }
            })
            ->when(! empty($filters['date_range']['from']), fn ($q) => $q->whereDate('created_at', '>=', $filters['date_range']['from']))
            ->when(! empty($filters['date_range']['to']), fn ($q) => $q->whereDate('created_at', '<=', $filters['date_range']['to']))
            ->when(isset($filters['is_hidden']) && $filters['is_hidden'] !== null, fn ($q) => $q->where('is_hidden', $filters['is_hidden']));

        $sort = SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        );

        $sort->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($filters);

        return $pagination->paginateQuery($query);
    }
}

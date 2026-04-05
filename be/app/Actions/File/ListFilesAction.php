<?php

namespace App\Actions\File;

use App\Models\File;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class ListFilesAction
{
    const DEFAULT_PER_PAGE = 15;
    /**
     * @param  array{user_id: int|null, created_from: string|null, created_to: string|null, per_page: int, page: int}  $payload
     */
    public function execute(array $payload): LengthAwarePaginator
    {
        $query = File::query()->orderByDesc('created_at')
            ->when(isset($payload['user_id']), function ($query) use ($payload) {
                $query->where('user_id', $payload['user_id']);
            })
            ->when(isset($payload['created_from']), function ($query) use ($payload) {
                $query->where('created_at', '>=', Carbon::parse($payload['created_from'])->startOfDay());
            })
            ->when(isset($payload['created_to']), function ($query) use ($payload) {
                $query->where('created_at', '<=', Carbon::parse($payload['created_to'])->endOfDay());
            });

        return $query->paginate(
            perPage: self::DEFAULT_PER_PAGE,
        );
    }
}

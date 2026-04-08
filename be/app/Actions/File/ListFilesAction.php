<?php

namespace App\Actions\File;

use App\Http\Requests\File\ListFilesRequest;
use App\Models\File;
use App\Models\User;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class ListFilesAction
{
    /**
     * Columns allowed for `order_by` (must match {@see ListFilesRequest} rules).
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'created_at',
        'updated_at',
        'original_name',
        'size',
        'file_name',
    ];

    /**
     * @param  array{user_id?: int|null, created_from?: string|null, created_to?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null, directory_prefix?: string|null, user?: User|null}  $payload
     */
    public function execute(array $payload): LengthAwarePaginator
    {
        $query = File::query()
            ->when(isset($payload['user']) && $payload['user'] !== null, function ($query) use ($payload) {
                $query->visibleToUser($payload['user']);
            })
            ->when(isset($payload['user_id']), function ($query) use ($payload) {
                $query->where('user_id', $payload['user_id']);
            })
            ->when(isset($payload['created_from']), function ($query) use ($payload) {
                $query->where('created_at', '>=', Carbon::parse($payload['created_from'])->startOfDay());
            })
            ->when(isset($payload['created_to']), function ($query) use ($payload) {
                $query->where('created_at', '<=', Carbon::parse($payload['created_to'])->endOfDay());
            })
            ->when(isset($payload['directory_prefix']) && $payload['directory_prefix'] !== null, function ($query) use ($payload) {
                $prefix = trim((string) $payload['directory_prefix'], '/');
                $query->where(function ($directoryQuery) use ($prefix) {
                    $directoryQuery
                        ->where('path', $prefix)
                        ->orWhere('path', 'like', $prefix.'/%');
                });
            });

        SortInput::fromValidatedArray(
            $payload,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'created_at',
            defaultDirection: 'desc',
        )->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($payload);

        return $pagination->paginateQuery($query);
    }
}

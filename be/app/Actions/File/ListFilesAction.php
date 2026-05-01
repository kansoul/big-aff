<?php

namespace App\Actions\File;

use App\Models\File;
use App\Models\User;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

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
        /** @var User|null $user */
        $user = Auth::user();

        $query = File::query()
            ->visibleToUser($user)
            ->when(isset($payload['user_id']), function ($query) use ($payload) {
                $query->where('user_id', $payload['user_id']);
            })
            ->when(isset($payload['created_from']), function ($query) use ($payload) {
                $query->where('created_at', '>=', Carbon::parse($payload['created_from'])->startOfDay());
            })
            ->when(isset($payload['created_to']), function ($query) use ($payload) {
                $query->where('created_at', '<=', Carbon::parse($payload['created_to'])->endOfDay());
            })
            ->when(isset($payload['alt_text']), function ($query) use ($payload) {
                $query->where('alt_text', 'like', '%' . $payload['alt_text'] . '%');
            });

        SortInput::fromValidatedArray(
            $payload,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        $pagination = PaginationInput::fromValidatedArray($payload);

        return $pagination->paginateQuery($query);
    }
}

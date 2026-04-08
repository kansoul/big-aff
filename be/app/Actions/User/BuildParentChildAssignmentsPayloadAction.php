<?php

namespace App\Actions\User;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;

class BuildParentChildAssignmentsPayloadAction
{
    /**
     * @param  array{assignments: LengthAwarePaginator, user_options: Paginator}  $payload
     * @return array{
     *     data: array{
     *         assignments: array<int, mixed>,
     *         user_options: array<int, mixed>
     *     },
     *     pagination: array{
     *         current_page: int,
     *         from: int|null,
     *         to: int|null,
     *         last_page: int,
     *         last_page_url: string,
     *         next_page_url: string|null,
     *         path: string,
     *         per_page: int,
     *         prev_page_url: string|null,
     *         total: int
     *     },
     *     options_pagination: array{
     *         current_page: int,
     *         per_page: int,
     *         has_more_pages: bool,
     *         next_page_url: string|null,
     *         prev_page_url: string|null
     *     }
     * }
     */
    public function execute(array $payload): array
    {
        /** @var LengthAwarePaginator $assignments */
        $assignments = $payload['assignments'];
        /** @var Paginator $userOptions */
        $userOptions = $payload['user_options'];

        return [
            'data' => [
                'assignments' => $assignments->items(),
                'user_options' => $userOptions->items(),
            ],
            'pagination' => [
                'current_page' => $assignments->currentPage(),
                'from' => $assignments->firstItem(),
                'to' => $assignments->lastItem(),
                'last_page' => $assignments->lastPage(),
                'last_page_url' => $assignments->url($assignments->lastPage()),
                'next_page_url' => $assignments->nextPageUrl(),
                'path' => $assignments->path(),
                'per_page' => $assignments->perPage(),
                'prev_page_url' => $assignments->previousPageUrl(),
                'total' => $assignments->total(),
            ],
            'options_pagination' => [
                'current_page' => $userOptions->currentPage(),
                'per_page' => $userOptions->perPage(),
                'has_more_pages' => $userOptions->hasMorePages(),
                'next_page_url' => $userOptions->nextPageUrl(),
                'prev_page_url' => $userOptions->previousPageUrl(),
            ],
        ];
    }
}

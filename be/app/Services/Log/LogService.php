<?php

namespace App\Services\Log;

use App\Actions\Log\GetLogEntryAction;
use App\Actions\Log\ListLogEntriesAction;
use App\Actions\Log\ListLogFilesAction;
use App\Actions\Log\TailLogEntriesAction;

class LogService
{
    public function __construct(
        private readonly ListLogFilesAction $listFilesAction,
        private readonly ListLogEntriesAction $listEntriesAction,
        private readonly TailLogEntriesAction $tailAction,
        private readonly GetLogEntryAction $getEntryAction,
    ) {}

    /**
     * @return list<array{name: string, size: int, modified_at: string}>
     */
    public function files(): array
    {
        return $this->listFilesAction->execute();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{data: list<array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function list(array $filters): array
    {
        return $this->listEntriesAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function tail(array $filters): array
    {
        return $this->tailAction->execute($filters);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        return $this->getEntryAction->execute($id);
    }
}

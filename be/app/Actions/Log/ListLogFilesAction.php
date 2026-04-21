<?php

namespace App\Actions\Log;

use App\Services\Log\LogReaderService;

class ListLogFilesAction
{
    public function __construct(
        private readonly LogReaderService $reader,
    ) {}

    /**
     * @return list<array{name: string, size: int, modified_at: string}>
     */
    public function execute(): array
    {
        return $this->reader->listFiles();
    }
}

<?php

namespace App\Actions\Log;

use App\Services\Log\LogReaderService;
use App\Support\Log\LogParser;
use InvalidArgumentException;

class TailLogEntriesAction
{
    public function __construct(
        private readonly LogReaderService $reader,
        private readonly LogParser $parser,
    ) {}

    /**
     * Return the most recent log entries from a file.
     *
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function execute(array $filters): array
    {
        $filename = $filters['file'] ?? $this->reader->defaultFilename();
        $limit = max(1, min(500, (int) ($filters['limit'] ?? 100)));

        try {
            $path = $this->reader->resolveFilePath($filename);
        } catch (InvalidArgumentException) {
            return [];
        }

        $lines = $this->reader->readLines($path);
        $entries = $this->parser->parseLines($filename, $lines);

        return array_values(array_slice(array_reverse($entries), 0, $limit));
    }
}

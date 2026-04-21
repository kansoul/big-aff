<?php

namespace App\Actions\Log;

use App\Services\Log\LogReaderService;
use App\Support\Log\LogParser;
use InvalidArgumentException;

class GetLogEntryAction
{
    public function __construct(
        private readonly LogReaderService $reader,
        private readonly LogParser $parser,
    ) {}

    /**
     * Fetch a single log entry by its encoded ID.
     *
     * @return array<string, mixed>|null
     */
    public function execute(string $encodedId): ?array
    {
        $decoded = $this->parser->decodeId($encodedId);

        if ($decoded === null) {
            return null;
        }

        ['filename' => $filename, 'line' => $startLine] = $decoded;

        try {
            $path = $this->reader->resolveFilePath($filename);
        } catch (InvalidArgumentException) {
            return null;
        }

        // Read from the starting line; parse only the first entry found.
        $lines = $this->reader->readFromLine($path, $startLine, maxLines: 300);
        $entries = $this->parser->parseLines($filename, $lines);

        return $entries[0] ?? null;
    }
}

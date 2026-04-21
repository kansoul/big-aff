<?php

namespace App\Actions\Log;

use App\Services\Log\LogReaderService;
use App\Support\Log\LogParser;
use InvalidArgumentException;

class ListLogEntriesAction
{
    public const LOG_LEVELS = ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'];

    public function __construct(
        private readonly LogReaderService $reader,
        private readonly LogParser $parser,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{data: list<array<string, mixed>>, pagination: array<string, mixed>}
     */
    public function execute(array $filters): array
    {
        $filename = $filters['file'] ?? null;

        $entries = [];

        if ($filename) {
            try {
                $path = $this->reader->resolveFilePath($filename);
                $lines = $this->reader->readLines($path);
                $entries = $this->parser->parseLines($filename, $lines);
            } catch (InvalidArgumentException $e) {
                return $this->emptyResult($filters);
            }
        } else {
            foreach ($this->reader->listFiles() as $fileMeta) {
                try {
                    $path = $this->reader->resolveFilePath($fileMeta['name']);
                    $lines = $this->reader->readLines($path);
                    $fileEntries = $this->parser->parseLines($fileMeta['name'], $lines);
                    $entries = array_merge($entries, $fileEntries);
                } catch (\Exception $e) {
                    continue;
                }
            }
            // Sort all collected entries by timestamp chronologically
            usort($entries, static fn (array $a, array $b): int => $a['timestamp'] <=> $b['timestamp']);
        }

        // Newest first
        $entries = array_reverse($entries);

        $entries = $this->applyFilters($entries, $filters);

        $total = count($entries);
        $perPage = (int) ($filters['per_page'] ?? 50);
        $page = (int) ($filters['page'] ?? 1);
        $perPage = max(1, min(200, $perPage));
        $page = max(1, $page);

        $offset = ($page - 1) * $perPage;
        $items = array_slice($entries, $offset, $perPage);
        $lastPage = (int) ceil($total / $perPage);

        return [
            'data' => array_values($items),
            'pagination' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => max(1, $lastPage),
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $entries
     * @return list<array<string, mixed>>
     */
    private function applyFilters(array $entries, array $filters): array
    {
        $level = isset($filters['level']) ? strtolower($filters['level']) : null;
        $keyword = isset($filters['keyword']) ? strtolower(trim($filters['keyword'])) : null;

        if ($level === null && $keyword === null) {
            return $entries;
        }

        return array_values(array_filter($entries, static function (array $entry) use ($level, $keyword): bool {
            if ($level !== null && $entry['level'] !== $level) {
                return false;
            }

            if ($keyword !== null) {
                $haystack = strtolower($entry['message'].' '.$entry['stack_trace']);
                if (! str_contains($haystack, $keyword)) {
                    return false;
                }
            }

            return true;
        }));
    }

    /**
     * @return array{data: list<array<string, mixed>>, pagination: array<string, mixed>}
     */
    private function emptyResult(array $filters): array
    {
        $perPage = max(1, min(200, (int) ($filters['per_page'] ?? 50)));

        return [
            'data' => [],
            'pagination' => [
                'total' => 0,
                'per_page' => $perPage,
                'current_page' => 1,
                'last_page' => 1,
            ],
        ];
    }
}

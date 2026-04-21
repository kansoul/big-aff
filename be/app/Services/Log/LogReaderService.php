<?php

namespace App\Services\Log;

use InvalidArgumentException;
use SplFileInfo;

/**
 * Handles safe file access for the log directory.
 *
 * Path traversal is prevented by validating filenames against a strict pattern
 * and confirming the realpath is within the logs directory.
 */
class LogReaderService
{
    /** Only load the last N lines of very large files to avoid memory exhaustion. */
    private const MAX_LINES = 50_000;

    private const ALLOWED_FILENAME_PATTERN = '/^.*\.log$/';

    /**
     * Return all valid log filenames sorted newest-modified first.
     *
     * @return list<array{name: string, size: int, modified_at: string}>
     */
    public function listFiles(): array
    {
        $dir = storage_path('logs');
        $pattern = $dir . '/*.log';

        $paths = array_filter(glob($pattern) ?: [], static fn(string $path): bool => filesize($path) > 0);

        usort($paths, static fn(string $a, string $b): int => filemtime($b) <=> filemtime($a));

        return array_map(static function (string $path): array {
            $info = new SplFileInfo($path);

            return [
                'name' => $info->getFilename(),
                'size' => $info->getSize(),
                'modified_at' => date('Y-m-d\TH:i:sP', (int) $info->getMTime()),
            ];
        }, $paths);
    }

    /**
     * Validate a filename and return its absolute path.
     *
     * @throws InvalidArgumentException on invalid name or traversal attempt.
     */
    public function resolveFilePath(string $filename): string
    {
        if (! preg_match(self::ALLOWED_FILENAME_PATTERN, $filename)) {
            throw new InvalidArgumentException('Invalid log filename.');
        }

        $candidate = storage_path('logs/' . basename($filename));
        $logsDir = realpath(storage_path('logs'));
        $real = realpath($candidate);

        if ($real === false || $logsDir === false) {
            throw new InvalidArgumentException('Log file not found.');
        }

        if (! str_starts_with($real, $logsDir . DIRECTORY_SEPARATOR)) {
            throw new InvalidArgumentException('Log file not found.');
        }

        return $real;
    }

    /**
     * Read all lines from a file, capped at MAX_LINES from the end.
     * Keys are the original 0-based line numbers.
     *
     * @return array<int, string>
     */
    public function readLines(string $filePath): array
    {
        $raw = file($filePath, FILE_IGNORE_NEW_LINES) ?: [];

        if (count($raw) > self::MAX_LINES) {
            $offset = count($raw) - self::MAX_LINES;
            $raw = array_slice($raw, $offset, null, false);
            // Re-index with original line numbers
            $reindexed = [];
            foreach ($raw as $i => $line) {
                $reindexed[$offset + $i] = $line;
            }

            return $reindexed;
        }

        return $raw;
    }

    /**
     * Read lines starting from a specific line number (for single-entry fetch).
     *
     * @return array<int, string>
     */
    public function readFromLine(string $filePath, int $startLine, int $maxLines = 300): array
    {
        $all = file($filePath, FILE_IGNORE_NEW_LINES) ?: [];
        $result = [];

        for ($i = $startLine; $i < min(count($all), $startLine + $maxLines); $i++) {
            $result[$i] = $all[$i];
        }

        return $result;
    }

    public function defaultFilename(): string
    {
        return 'laravel.log';
    }
}

<?php

namespace App\Support\Log;

/**
 * Parses Monolog/Laravel log lines into structured entries.
 *
 * Handles multiline entries where stack traces follow the initial log line.
 * Entry IDs encode filename + starting line number for stable references.
 */
class LogParser
{
    /** Matches the Monolog LineFormatter header: [datetime] channel.LEVEL: rest */
    private const ENTRY_REGEX = '/^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\] (\w+)\.(EMERGENCY|ALERT|CRITICAL|ERROR|WARNING|NOTICE|INFO|DEBUG): (.*)/i';

    /**
     * Parse an array of raw lines (indexed by original line number) into log entries.
     *
     * @param  array<int, string>  $lines  Keys are 0-based original line numbers.
     * @return list<array{id: string, timestamp: string, channel: string, level: string, message: string, stack_trace: string, raw: string}>
     */
    public function parseLines(string $filename, array $lines): array
    {
        $entries = [];
        $current = null;

        foreach ($lines as $lineNum => $line) {
            $trimmed = rtrim($line, "\r\n");

            if (preg_match(self::ENTRY_REGEX, $trimmed, $m)) {
                if ($current !== null) {
                    $current['stack_trace'] = rtrim($current['stack_trace'] ?? '');
                    $entries[] = $current;
                }

                $current = [
                    'id' => $this->encodeId($filename, $lineNum),
                    'timestamp' => $m[1],
                    'channel' => strtolower($m[2]),
                    'level' => strtolower($m[3]),
                    'message' => $m[4],
                    'stack_trace' => '',
                    'raw' => $trimmed,
                ];
            } elseif ($current !== null) {
                $current['stack_trace'] .= $trimmed."\n";
                $current['raw'] .= "\n".$trimmed;
            }
        }

        if ($current !== null) {
            $current['stack_trace'] = rtrim($current['stack_trace'] ?? '');
            $entries[] = $current;
        }

        return $entries;
    }

    /**
     * Encode filename + line number into a URL-safe base64 ID.
     */
    public function encodeId(string $filename, int $lineNum): string
    {
        return rtrim(strtr(base64_encode($filename.':'.$lineNum), '+/', '-_'), '=');
    }

    /**
     * Decode an entry ID back to filename + line number.
     *
     * @return array{filename: string, line: int}|null
     */
    public function decodeId(string $id): ?array
    {
        $padded = str_pad(strtr($id, '-_', '+/'), strlen($id) + (4 - strlen($id) % 4) % 4, '=');
        $decoded = base64_decode($padded, strict: true);

        if ($decoded === false) {
            return null;
        }

        $lastColon = strrpos($decoded, ':');

        if ($lastColon === false) {
            return null;
        }

        return [
            'filename' => substr($decoded, 0, $lastColon),
            'line' => (int) substr($decoded, $lastColon + 1),
        ];
    }
}

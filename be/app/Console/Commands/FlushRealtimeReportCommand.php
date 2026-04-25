<?php

namespace App\Console\Commands;

use App\Models\RealtimeReport;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class FlushRealtimeReportCommand extends Command
{
    protected $signature = 'tracking:flush-daily';

    protected $description = 'Flush buffered Redis tracking counts into tracking_daily table';

    private const BATCH_SIZE = 200;

    public function handle(): void
    {
        $keys = $this->scanKeys('tracking_daily:*');
        if (empty($keys)) {
            return;
        }

        $rows = $this->collectRows($keys);
        if (empty($rows)) {
            return;
        }

        foreach (array_chunk($rows, self::BATCH_SIZE) as $chunk) {
            $this->upsertChunk($chunk);
        }

        $this->line('Flushed '.count($rows).' tracking_daily rows from Redis.');
    }

    /**
     * Use SCAN (non-blocking) instead of KEYS to avoid blocking the Redis event
     *
     * @return string[]
     */
    private function scanKeys(string $pattern): array
    {
        $keys = [];
        $cursor = 0;

        do {
            $result = Redis::scan($cursor, $pattern, 200);
            if ($result === false) {
                break;
            }
            [$cursor, $found] = $result;
            $keys = array_merge($keys, $found ?? []);
            $cursor = (int) $cursor;
        } while ($cursor !== 0);

        return array_unique($keys);
    }

    /**
     * Atomically read and delete each Redis key via a Lua script so that
     *
     * @param  string[]  $keys
     * @return array<int, array<string, mixed>>
     */
    private function collectRows(array $keys): array
    {
        $script = <<<'LUA'
            local data = redis.call('HGETALL', KEYS[1])
            redis.call('DEL', KEYS[1])
            return data
        LUA;

        $rows = [];
        $now = now();
        foreach ($keys as $key) {
            $normalizedKey = $this->normalizeRedisKey($key);
            $parts = explode(':', $normalizedKey, 3);

            if (count($parts) !== 3) {
                continue;
            }

            [, $date, $linkDataId] = $parts;

            /** @var list<string> $hash */
            $hash = Redis::eval($script, 1, $normalizedKey);

            if (empty($hash)) {
                continue;
            }

            // HGETALL returns a flat [field, value, field, value, …] list
            $counts = array_column(array_chunk($hash, 2), 1, 0);

            $rows[] = [
                'event_time' => $date,
                'link_data_id' => (int) $linkDataId,
                'view_article_count' => (int) ($counts['view_article_count'] ?? 0),
                'view_search_count' => (int) ($counts['view_search_count'] ?? 0),
                'click_keyword_count' => (int) ($counts['click_keyword_count'] ?? 0),
                'click_ad_count' => (int) ($counts['click_ad_count'] ?? 0),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $rows;
    }

    private function normalizeRedisKey(string $key): string
    {
        $prefix = (string) config('database.redis.options.prefix', '');

        if ($prefix !== '' && Str::startsWith($key, $prefix)) {
            return (string) Str::after($key, $prefix);
        }

        return $key;
    }

    /**
     * Bulk-upsert using additive ON DUPLICATE KEY UPDATE so that concurrent
     * flushes on multiple servers accumulate rather than overwrite each other.
     *
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function upsertChunk(array $rows): void
    {
        try {
            RealtimeReport::upsert(
                $rows,
                uniqueBy: ['event_time', 'link_data_id'],
                update: [
                    'view_article_count' => DB::raw('view_article_count + VALUES(view_article_count)'),
                    'view_search_count' => DB::raw('view_search_count + VALUES(view_search_count)'),
                    'click_keyword_count' => DB::raw('click_keyword_count + VALUES(click_keyword_count)'),
                    'click_ad_count' => DB::raw('click_ad_count + VALUES(click_ad_count)'),
                    'updated_at' => DB::raw('NOW()'),
                ],
            );
        } catch (Exception $e) {
            Log::channel('tracking_events')->error('FlushRealtimeReportCommand upsert failed', [
                'error' => $e->getMessage(),
                'rows' => count($rows),
            ]);

            throw $e;
        }
    }
}

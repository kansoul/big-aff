<?php

namespace App\Console\Commands;

use App\Models\RealtimeReport;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

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
     * phpredis scan() uses a reference cursor and returns keys directly.
     * The configured prefix is NOT auto-applied to SCAN patterns, so we
     * must add it manually and strip it from the returned keys.
     *
     * @return string[]
     */
    private function scanKeys(string $pattern): array
    {
        $prefix = (string) config('database.redis.options.prefix', '');
        $prefixedPattern = $prefix.$pattern;

        /** @var \Redis $client */
        $client = Redis::connection()->client();

        $keys = [];
        $cursor = null;

        do {
            $found = $client->scan($cursor, $prefixedPattern, 200);

            if ($found !== false && ! empty($found)) {
                foreach ($found as $key) {
                    $keys[] = $prefix !== '' && str_starts_with($key, $prefix)
                        ? substr($key, strlen($prefix))
                        : $key;
                }
            }
        } while ($cursor > 0);

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
            $parts = explode(':', $key, 3);

            if (count($parts) !== 3) {
                continue;
            }

            [, $date, $campaignId] = $parts;

            /** @var list<string> $hash */
            $hash = Redis::eval($script, 1, $key);

            if (empty($hash)) {
                continue;
            }

            // HGETALL returns a flat [field, value, field, value, …] list
            $counts = array_column(array_chunk($hash, 2), 1, 0);

            $rows[] = [
                'event_time' => $date,
                'campaign_id' => $campaignId,
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
                uniqueBy: ['event_time', 'campaign_id'],
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

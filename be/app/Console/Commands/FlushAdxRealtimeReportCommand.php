<?php

namespace App\Console\Commands;

use App\Models\AdxRealtimeReport;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class FlushAdxRealtimeReportCommand extends Command
{
    protected $signature = 'adx:flush-realtime';

    protected $description = 'Flush buffered Redis AdX funnel counts into adx_realtime_reports table';

    private const BATCH_SIZE = 200;

    public function handle(): void
    {
        $keys = $this->scanKeys('adx_realtime:*');
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

        $this->line('Flushed '.count($rows).' adx_realtime_reports rows from Redis.');
    }

    /**
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

            [, $date, $linkDataId] = $parts;

            /** @var list<string> $hash */
            $hash = Redis::eval($script, 1, $key);
            if (empty($hash)) {
                continue;
            }

            $counts = array_column(array_chunk($hash, 2), 1, 0);

            $rows[] = [
                'report_date' => $date,
                'adx_link_data_id' => (int) $linkDataId,
                'landing_views' => (int) ($counts['landing_views'] ?? 0),
                'get_game_link_clicks' => (int) ($counts['get_game_link_clicks'] ?? 0),
                'detail_views' => (int) ($counts['detail_views'] ?? 0),
                'get_bonus_clicks' => (int) ($counts['get_bonus_clicks'] ?? 0),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function upsertChunk(array $rows): void
    {
        try {
            AdxRealtimeReport::query()->upsert(
                $rows,
                uniqueBy: ['report_date', 'adx_link_data_id'],
                update: [
                    'landing_views' => DB::raw('landing_views + VALUES(landing_views)'),
                    'get_game_link_clicks' => DB::raw('get_game_link_clicks + VALUES(get_game_link_clicks)'),
                    'detail_views' => DB::raw('detail_views + VALUES(detail_views)'),
                    'get_bonus_clicks' => DB::raw('get_bonus_clicks + VALUES(get_bonus_clicks)'),
                    'updated_at' => DB::raw('NOW()'),
                ],
            );
        } catch (Exception $e) {
            Log::channel('tracking_events')->error('FlushAdxRealtimeReportCommand upsert failed', [
                'error' => $e->getMessage(),
                'rows' => count($rows),
            ]);

            throw $e;
        }
    }
}

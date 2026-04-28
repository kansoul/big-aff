<?php

namespace App\Console\Commands;

use App\Models\Follow;
use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\LazyCollection;

class MigrateFollowBackupCommand extends Command
{
    protected $signature = 'backup:migrate-follows
        {--path= : Absolute path to follows-backup.json}';

    protected $description = 'Migrate follows backup JSON into follows table';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/follows-backup.json');

        if (! is_file($path)) {
            $this->error("Backup file not found: {$path}");

            return self::FAILURE;
        }

        $postMap = $this->buildPostMap();
        $now = now();
        $rows = [];
        $processed = 0;
        $inserted = 0;
        $missingPost = 0;

        foreach ($this->streamBackupRecords($path) as $record) {
            $processed++;

            $postSlug = (string) ($record['post_id'] ?? '');
            $postId = $postMap[$this->normalizeSlug($postSlug)] ?? null;
            if ($postSlug !== '' && $postId === null) {
                $missingPost++;
            }

            $rows[] = [
                'email' => $record['email'] ?? null,
                'post_id' => $postId,
                'style_code' => null,
                'channel_code' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($rows) >= self::BATCH_SIZE) {
                Follow::query()->insert($rows);
                $inserted += count($rows);
                $rows = [];
            }
        }

        if ($rows !== []) {
            Follow::query()->insert($rows);
            $inserted += count($rows);
        }

        $this->info("Processed: {$processed}");
        $this->info("Inserted: {$inserted}");
        $this->warn("Missing post slug mapping: {$missingPost}");

        return self::SUCCESS;
    }

    /**
     * @return array<string, int>
     */
    private function buildPostMap(): array
    {
        $postMap = [];

        Post::query()
            ->select(['id', 'slug'])
            ->whereNotNull('slug')
            ->get()
            ->each(function (Post $post) use (&$postMap): void {
                $postMap[$this->normalizeSlug((string) $post->slug)] = (int) $post->id;
            });

        return $postMap;
    }

    /**
     * @return LazyCollection<int, array<string, mixed>>
     */
    private function streamBackupRecords(string $path): LazyCollection
    {
        return LazyCollection::make(function () use ($path): \Generator {
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return;
            }

            $buffer = '';
            $depth = 0;
            $insideObject = false;

            try {
                while (($line = fgets($handle)) !== false) {
                    $trimmed = trim($line);

                    if ($trimmed === '[' || $trimmed === ']' || $trimmed === ',') {
                        continue;
                    }

                    $openCount = substr_count($line, '{');
                    $closeCount = substr_count($line, '}');

                    if (! $insideObject && $openCount > 0) {
                        $insideObject = true;
                        $buffer = '';
                        $depth = 0;
                    }

                    if ($insideObject) {
                        $buffer .= $line;
                        $depth += $openCount;
                        $depth -= $closeCount;

                        if ($depth <= 0) {
                            $insideObject = false;
                            $decoded = json_decode(rtrim($buffer, ", \r\n"), true);

                            if (is_array($decoded)) {
                                yield $decoded;
                            }
                        }
                    }
                }
            } finally {
                fclose($handle);
            }
        });
    }

    private function normalizeUrl(string $url): string
    {
        return rtrim(mb_strtolower(trim($url)), '/');
    }

    private function normalizeSlug(string $slug): string
    {
        return trim($slug);
    }
}

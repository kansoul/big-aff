<?php

namespace App\Console\Commands;

use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File as FileFacade;
use Illuminate\Support\Facades\Storage;

class BackupPostsCommand extends Command
{
    protected $signature = 'posts:backup
        {--ids= : Comma separated list of post ids to back up (e.g. 1,2,3)}
        {--ids-file= : Path to a JSON file with the list of post ids ([1,2,3] or {"post_ids":[1,2,3]})}
        {--output= : Absolute path for the generated bundle JSON (default backup-new/posts-bundle.json)}
        {--files-dir= : Directory where physical media files are copied (default a "files" folder next to the JSON)}
        {--without-media : Skip copying physical media files (metadata only)}';

    protected $description = 'Back up posts with their media, categories and keyword sets into a JSON bundle plus a media backup folder for import into another domain';

    /**
     * Bundle format version. Must stay in sync with ImportPostsCommand::SUPPORTED_VERSION.
     */
    private const VERSION = 1;

    public function handle(): int
    {
        $postIds = $this->resolvePostIds();

        $query = Post::query()->with(['featureMedia', 'keywordSets', 'category']);
        if ($postIds !== null) {
            $query->whereIn('id', $postIds);
        }

        /** @var Collection<int, Post> $posts */
        $posts = $query->orderBy('id')->get();

        if ($posts->isEmpty()) {
            $this->error('No posts matched the given selection. Nothing to back up.');

            return self::FAILURE;
        }

        $outputPath = $this->resolveOutputPath();
        $filesDir = $this->resolveFilesDir($outputPath);

        if (! $this->ensureDirectory(dirname($outputPath)) || ! $this->ensureDirectory($filesDir)) {
            return self::FAILURE;
        }

        $copyMedia = ! (bool) $this->option('without-media');

        /** @var array<string, array<string, mixed>> $files */
        $files = [];
        /** @var array<int, string> $fileKeyBySourceId */
        $fileKeyBySourceId = [];
        /** @var array<string, array<string, mixed>> $keywordSets */
        $keywordSets = [];
        /** @var array<int, string> $keywordSetKeyBySourceId */
        $keywordSetKeyBySourceId = [];
        /** @var array<string, array<string, mixed>> $categories */
        $categories = [];
        /** @var array<int, string> $categoryKeyBySourceId */
        $categoryKeyBySourceId = [];
        $missingMedia = 0;
        $copiedMedia = 0;

        $postRecords = [];
        $postSeq = 0;

        foreach ($posts as $post) {
            $featureMediaKey = null;
            $featureMedia = $post->featureMedia;

            if ($featureMedia !== null) {
                $sourceFileId = (int) $featureMedia->id;
                $featureMediaKey = $fileKeyBySourceId[$sourceFileId] ?? null;

                if ($featureMediaKey === null) {
                    $featureMediaKey = 'file_'.(count($files) + 1);
                    $fileKeyBySourceId[$sourceFileId] = $featureMediaKey;

                    $disk = (string) $featureMedia->disk;
                    $path = (string) $featureMedia->path;
                    $backupRelativePath = $disk.'/'.ltrim($path, '/');

                    if ($copyMedia) {
                        if ($path !== '' && Storage::disk($disk)->exists($path)) {
                            $destination = $filesDir.DIRECTORY_SEPARATOR.$backupRelativePath;
                            FileFacade::ensureDirectoryExists(dirname($destination));
                            file_put_contents($destination, (string) Storage::disk($disk)->get($path));
                            $copiedMedia++;
                        } else {
                            $missingMedia++;
                            $this->warn("Physical media missing on disk for file #{$featureMedia->id} ({$path}).");
                        }
                    }

                    $files[$featureMediaKey] = [
                        'backup_key' => $featureMediaKey,
                        'original_id' => count($files) + 1,
                        'disk' => $disk,
                        'file_name' => (string) $featureMedia->file_name,
                        'original_name' => (string) $featureMedia->original_name,
                        'mime_type' => (string) $featureMedia->mime_type,
                        'size' => (int) $featureMedia->size,
                        'path' => $path,
                        'alt_text' => $featureMedia->alt_text,
                        'backup_relative_path' => $backupRelativePath,
                    ];
                }
            }

            $keywordSetKeys = [];
            foreach ($post->keywordSets as $keywordSet) {
                $sourceKeywordSetId = (int) $keywordSet->id;
                $keywordSetKey = $keywordSetKeyBySourceId[$sourceKeywordSetId] ?? null;

                if ($keywordSetKey === null) {
                    $keywordSetKey = 'ks_'.(count($keywordSets) + 1);
                    $keywordSetKeyBySourceId[$sourceKeywordSetId] = $keywordSetKey;

                    $keywordSets[$keywordSetKey] = [
                        'backup_key' => $keywordSetKey,
                        'original_id' => count($keywordSets) + 1,
                        'name' => (string) $keywordSet->name,
                        'keywords' => $keywordSet->keywords ?? [],
                    ];
                }

                $keywordSetKeys[] = $keywordSetKey;
            }

            $categoryKey = null;
            $category = $post->category;
            if ($category !== null) {
                $sourceCategoryId = (int) $category->id;
                $categoryKey = $categoryKeyBySourceId[$sourceCategoryId] ?? null;

                if ($categoryKey === null) {
                    $categoryKey = 'cat_'.(count($categories) + 1);
                    $categoryKeyBySourceId[$sourceCategoryId] = $categoryKey;

                    $categories[$categoryKey] = [
                        'backup_key' => $categoryKey,
                        'original_id' => count($categories) + 1,
                        'name' => (string) $category->name,
                        'description' => $category->description,
                    ];
                }
            }

            $postRecords[] = [
                'original_id' => ++$postSeq,
                'title' => $post->title,
                'slug' => $post->slug,
                'lang' => $post->lang,
                'note' => $post->note,
                'description' => $post->description,
                'content' => $post->content,
                'status' => $post->status?->value,
                'is_hidden' => (bool) $post->is_hidden,
                'type' => $post->type?->value,
                'published_at' => $post->published_at?->toIso8601String(),
                'feature_media_key' => $featureMediaKey,
                'category_key' => $categoryKey,
                'keyword_set_keys' => $keywordSetKeys,
            ];
        }

        $bundle = [
            'version' => self::VERSION,
            'generated_at' => now()->toIso8601String(),
            'source' => [
                'app_url' => (string) config('app.url'),
                'post_count' => count($postRecords),
            ],
            'files_dir' => basename($filesDir),
            'post_ids' => array_map(static fn (array $record): int => $record['original_id'], $postRecords),
            'files' => array_values($files),
            'categories' => array_values($categories),
            'keyword_sets' => array_values($keywordSets),
            'posts' => $postRecords,
        ];

        $json = json_encode($bundle, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            $this->error('Failed to encode backup bundle as JSON.');

            return self::FAILURE;
        }

        file_put_contents($outputPath, $json);

        $this->info('Backup completed.');
        $this->line('Bundle written to: '.$outputPath);
        $this->line('Media backup folder: '.$filesDir);
        $this->line('Posts backed up: '.count($postRecords));
        $this->line('Files referenced: '.count($files).($copyMedia ? " (copied: {$copiedMedia})" : ' (metadata only)'));
        $this->line('Categories included: '.count($categories));
        $this->line('Keyword sets included: '.count($keywordSets));
        if ($missingMedia > 0) {
            $this->warn('Media files missing on disk (not copied): '.$missingMedia);
        }

        return self::SUCCESS;
    }

    private function ensureDirectory(string $directory): bool
    {
        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            $this->error("Unable to create directory: {$directory}");

            return false;
        }

        return true;
    }

    /**
     * @return array<int, int>|null Null means "all posts".
     */
    private function resolvePostIds(): ?array
    {
        $ids = [];

        $idsOption = (string) ($this->option('ids') ?? '');
        if (trim($idsOption) !== '') {
            $ids = array_merge($ids, $this->parseIds(explode(',', $idsOption)));
        }

        $idsFile = (string) ($this->option('ids-file') ?? '');
        if (trim($idsFile) !== '') {
            if (! is_file($idsFile)) {
                $this->warn("ids-file not found, ignoring: {$idsFile}");
            } else {
                /** @var mixed $decoded */
                $decoded = json_decode((string) file_get_contents($idsFile), true);
                $list = is_array($decoded) ? ($decoded['post_ids'] ?? $decoded) : [];
                if (is_array($list)) {
                    $ids = array_merge($ids, $this->parseIds($list));
                }
            }
        }

        if ($ids === []) {
            return null;
        }

        return array_values(array_unique($ids));
    }

    /**
     * @param  array<int, mixed>  $values
     * @return array<int, int>
     */
    private function parseIds(array $values): array
    {
        return collect($values)
            ->filter(static fn (mixed $value): bool => is_numeric($value))
            ->map(static fn (mixed $value): int => (int) $value)
            ->filter(static fn (int $id): bool => $id > 0)
            ->values()
            ->all();
    }

    private function resolveOutputPath(): string
    {
        $output = (string) ($this->option('output') ?? '');

        return trim($output) !== '' ? $output : storage_path('app/backup-new/posts-bundle.json');
    }

    private function resolveFilesDir(string $outputPath): string
    {
        $filesDir = (string) ($this->option('files-dir') ?? '');

        return trim($filesDir) !== '' ? rtrim($filesDir, DIRECTORY_SEPARATOR) : dirname($outputPath).DIRECTORY_SEPARATOR.'files';
    }
}

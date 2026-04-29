<?php

namespace App\Console\Commands;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\File;
use App\Models\KeywordSet;
use App\Models\Post;
use App\Models\PostKeywordSet;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File as FileFacade;
use Illuminate\Support\Str;

class MigratePostBackupCommand extends Command
{
    protected $signature = 'backup:migrate-posts
        {--posts-path= : Absolute path to posts-backup.json}
        {--files-path= : Absolute path to post-files-by-title.json}
        {--files-source-dir= : Absolute source dir for physical files copy}
        {--truncate : Truncate files, posts, keyword sets and pivot before importing}';

    protected $description = 'Migrate posts backup JSON into files/posts/keyword_sets tables';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $postsPath = $this->option('posts-path') ?: storage_path('app/backup/posts-backup.json');
        $filesPath = $this->option('files-path') ?: storage_path('app/backup/post-files-by-title.json');
        $filesSourceDir = $this->option('files-source-dir') ?: storage_path('app/backup/post-files');

        if (! is_file($postsPath) || ! is_file($filesPath)) {
            $this->error("Backup file not found. posts: {$postsPath} | files: {$filesPath}");

            return self::FAILURE;
        }

        /** @var array<int, array<string, mixed>> $postRecords */
        $postRecords = json_decode((string) file_get_contents($postsPath), true) ?? [];
        /** @var array<int, array<string, mixed>> $fileRecords */
        $fileRecords = json_decode((string) file_get_contents($filesPath), true) ?? [];

        if ($postRecords === [] || $fileRecords === []) {
            $this->error('Backup JSON is empty or invalid.');

            return self::FAILURE;
        }

        if ((bool) $this->option('truncate')) {
            $this->truncateImportTables();
        }

        $fileImport = $this->importFiles($fileRecords, (string) $filesSourceDir);
        $fileMap = $fileImport['map'];
        $stats = $this->importPostsAndKeywords($postRecords, $fileMap);

        $this->info('Import completed.');
        $this->line('Files imported: ' . $stats['files_imported'] . ' (db rows: ' . $fileImport['inserted_rows'] . ')');
        $this->line('Files copied: ' . $fileImport['copied_files']);
        $this->warn('Files missing from backup/post-files: ' . $fileImport['missing_source_files']);
        $this->line('Posts imported: ' . $stats['posts_imported']);
        $this->line('Keyword sets created: ' . $stats['keyword_sets_created']);
        $this->line('Post-keyword links created: ' . $stats['pivot_created']);
        $this->warn('Feature media missing mapping: ' . $stats['missing_feature_media']);

        return self::SUCCESS;
    }

    private function truncateImportTables(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        PostKeywordSet::query()->truncate();
        Post::query()->truncate();
        KeywordSet::query()->truncate();
        File::query()->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * @param  array<int, array<string, mixed>>  $fileRecords
     * @return array{
     *     map: array<string, int>,
     *     inserted_rows: int,
     *     copied_files: int,
     *     missing_source_files: int
     * }
     */
    private function importFiles(array $fileRecords, string $filesSourceDir): array
    {
        $rows = [];
        $paths = [];
        $now = now();
        $imported = 0;
        $copiedFiles = 0;
        $missingSourceFiles = 0;
        $destinationDir = storage_path('app/public/media/posts');

        FileFacade::ensureDirectoryExists($destinationDir);

        foreach ($fileRecords as $record) {
            $backupRelativePath = $this->normalizeBackupRelativePath((string) ($record['path'] ?? ''));
            if ($backupRelativePath === '') {
                continue;
            }

            $normalizedPath = $this->normalizePath($backupRelativePath);
            $fileName = basename($normalizedPath);
            $sourcePath = $this->resolveSourcePath((string) $filesSourceDir, $backupRelativePath);
            $destinationPath = $destinationDir . DIRECTORY_SEPARATOR . $fileName;

            if ($sourcePath !== null) {
                if (! is_file($destinationPath)) {
                    copy($sourcePath, $destinationPath);
                }
                $copiedFiles++;
            } else {
                $missingSourceFiles++;
            }

            $rows[] = [
                'user_id' => null,
                'disk' => 'public',
                'file_name' => $fileName,
                'original_name' => $fileName,
                'mime_type' => $this->guessMimeType($fileName),
                'size' => max(0, (int) ($record['file_size'] ?? 0)),
                'path' => $normalizedPath,
                'alt_text' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            $paths[] = $normalizedPath;

            if (count($rows) >= self::BATCH_SIZE) {
                File::query()->insert($rows);
                $imported += count($rows);
                $rows = [];
            }
        }

        if ($rows !== []) {
            File::query()->insert($rows);
            $imported += count($rows);
        }

        $this->line("Inserted file rows: {$imported}");

        $map = File::query()
            ->select(['id', 'path'])
            ->whereIn('path', array_values(array_unique($paths)))
            ->get()
            ->pluck('id', 'path')
            ->map(fn(mixed $id): int => (int) $id)
            ->all();

        return [
            'map' => $map,
            'inserted_rows' => $imported,
            'copied_files' => $copiedFiles,
            'missing_source_files' => $missingSourceFiles,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $postRecords
     * @param  array<string, int>  $fileMap
     * @return array{
     *     files_imported: int,
     *     posts_imported: int,
     *     keyword_sets_created: int,
     *     pivot_created: int,
     *     missing_feature_media: int
     * }
     */
    private function importPostsAndKeywords(array $postRecords, array $fileMap): array
    {
        $keywordSetByHash = [];
        $postsImported = 0;
        $postsSkipped = 0;
        $keywordSetsCreated = 0;
        $pivotCreated = 0;
        $missingFeatureMedia = 0;
        $validCategoryIds = $this->buildValidIdLookup('categories');
        $validUserIds = $this->buildValidIdLookup('users');

        foreach ($postRecords as $record) {
            $slug = (string) ($record['slug'] ?? Str::slug((string) ($record['title'] ?? 'post-' . uniqid())));

            /** @var Post|null $existingPost */
            $existingPost = Post::query()->where('slug', $slug)->first();

            if ($existingPost !== null) {
                $post = $existingPost;
                $postsSkipped++;
            } else {
                $featureMediaPath = $this->normalizePath((string) ($record['feature_media'] ?? ''));
                $featureMediaId = $featureMediaPath !== '' ? ($fileMap[$featureMediaPath] ?? null) : null;
                if ($featureMediaPath !== '' && $featureMediaId === null) {
                    $missingFeatureMedia++;
                }

                $post = Post::query()->create([
                    'title' => (string) ($record['title'] ?? ''),
                    'slug' => $slug,
                    'lang' => $record['lang'] ?? null,
                    'note' => $record['note'] ?? null,
                    'description' => $record['description'] ?? null,
                    'content' => $this->normalizeContent($record['content'] ?? null),
                    'feature_media_id' => $featureMediaId,
                    'status' => $this->normalizeStatus((string) ($record['status'] ?? 'draft')),
                    'is_hidden' => (bool) ($record['is_hidden'] ?? false),
                    'type' => $this->normalizeType((string) ($record['type'] ?? '')),
                    'category_id' => $this->normalizeForeignId(Arr::get($record, 'category_id'), $validCategoryIds),
                    'created_by' => $this->normalizeForeignId(Arr::get($record, 'created_by'), $validUserIds),
                    'updated_by' => $this->normalizeForeignId(Arr::get($record, 'updated_by'), $validUserIds),
                    'published_at' => $this->normalizePublishedAt($record['published_at'] ?? null),
                ]);
                $postsImported++;
            }

            $allKeywordSets = $this->extractKeywordSets($record['tags_sets'] ?? []);
            $existingKeywordSetIds = PostKeywordSet::query()
                ->where('post_id', (int) $post->id)
                ->pluck('keyword_set_id')
                ->map(fn(mixed $id): int => (int) $id)
                ->all();

            foreach ($allKeywordSets as $keywords) {
                $hash = md5(json_encode($keywords));
                $keywordSetId = $keywordSetByHash[$hash] ?? null;

                if ($keywordSetId === null) {
                    $existing = KeywordSet::query()->where('keywords', json_encode($keywords))->first();
                    if ($existing !== null) {
                        $keywordSetId = (int) $existing->id;
                    } else {
                        $keywordSet = KeywordSet::query()->create([
                            'name' => mb_substr((string) ($record['title'] ?? $post->slug), 0, 255),
                            'keywords' => $keywords,
                            'created_by' => $this->normalizeForeignId(Arr::get($record, 'created_by'), $validUserIds),
                            'updated_by' => $this->normalizeForeignId(Arr::get($record, 'updated_by'), $validUserIds),
                        ]);
                        $keywordSetId = (int) $keywordSet->id;
                        $keywordSetsCreated++;
                    }

                    $keywordSetByHash[$hash] = $keywordSetId;
                }

                if (in_array($keywordSetId, $existingKeywordSetIds, true)) {
                    continue;
                }

                PostKeywordSet::query()->create([
                    'post_id' => (int) $post->id,
                    'keyword_set_id' => $keywordSetId,
                ]);
                $pivotCreated++;
                $existingKeywordSetIds[] = $keywordSetId;
            }
        }

        $this->line("Posts skipped (already exist): {$postsSkipped}");

        return [
            'files_imported' => count($fileMap),
            'posts_imported' => $postsImported,
            'keyword_sets_created' => $keywordSetsCreated,
            'pivot_created' => $pivotCreated,
            'missing_feature_media' => $missingFeatureMedia,
        ];
    }

    private function normalizePath(string $path): string
    {
        $fileName = basename($path);

        return $fileName !== '' ? 'media/posts/' . $fileName : '';
    }

    private function normalizeBackupRelativePath(string $path): string
    {
        return ltrim(trim($path), '/');
    }

    private function resolveSourcePath(string $filesSourceDir, string $backupRelativePath): ?string
    {
        $primaryPath = rtrim($filesSourceDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $backupRelativePath;
        if (is_file($primaryPath)) {
            return $primaryPath;
        }

        $fallbackPath = rtrim($filesSourceDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . basename($backupRelativePath);
        if (is_file($fallbackPath)) {
            return $fallbackPath;
        }

        return null;
    }

    private function guessMimeType(string $fileName): string
    {
        return match (mb_strtolower(pathinfo($fileName, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'avif' => 'image/avif',
            'svg' => 'image/svg+xml',
            default => 'application/octet-stream',
        };
    }

    private function normalizeContent(mixed $content): ?string
    {
        if (is_string($content)) {
            return $content;
        }

        if (is_array($content) && $content !== []) {
            return json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        return null;
    }

    private function normalizeStatus(string $status): string
    {
        return in_array($status, PostStatus::values(), true) ? $status : PostStatus::DRAFT->value;
    }

    private function normalizeType(string $type): ?string
    {
        if ($type === '') {
            return null;
        }

        return in_array($type, PostType::values(), true) ? $type : null;
    }

    private function normalizePublishedAt(mixed $publishedAt): ?Carbon
    {
        if (! is_string($publishedAt) || trim($publishedAt) === '') {
            return null;
        }

        try {
            return Carbon::parse($publishedAt)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<int, true>
     */
    private function buildValidIdLookup(string $table): array
    {
        return DB::table($table)
            ->select('id')
            ->pluck('id')
            ->mapWithKeys(fn(mixed $id): array => [(int) $id => true])
            ->all();
    }

    /**
     * @param  array<int, true>  $lookup
     */
    private function normalizeForeignId(mixed $value, array $lookup): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        $id = (int) $value;

        return $lookup[$id] ?? false ? $id : null;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function extractKeywordSets(mixed $tagSets): array
    {
        if (! is_array($tagSets) || $tagSets === []) {
            return [];
        }

        return collect($tagSets)
            ->filter(fn(mixed $set): bool => is_array($set) && $set !== [])
            ->map(
                fn(array $set): array => collect($set)
                    ->filter(fn(mixed $item): bool => is_string($item) && trim($item) !== '')
                    ->map(fn(string $keyword): string => trim($keyword))
                    ->unique()
                    ->values()
                    ->all()
            )
            ->filter(fn(array $keywords): bool => $keywords !== [])
            ->values()
            ->all();
    }
}

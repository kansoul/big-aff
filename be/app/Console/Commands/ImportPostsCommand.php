<?php

namespace App\Console\Commands;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\Category;
use App\Models\File;
use App\Models\KeywordSet;
use App\Models\Post;
use App\Models\PostKeywordSet;
use App\Models\PostUser;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ImportPostsCommand extends Command
{
    protected $signature = 'posts:import
        {--input= : Absolute path to the bundle produced by posts:backup (default backup-new/posts-bundle.json)}
        {--files-dir= : Directory holding the media backup files (default the "files" folder next to the JSON)}
        {--owner-id=1 : User id to own every imported record (default 1 = admin, so only admin can see them)}
        {--overwrite-media : Overwrite media files already present on disk at the same path}';

    protected $description = 'Import a posts bundle (posts + media + categories + keyword sets) produced by posts:backup into this domain, owned by the admin';

    /**
     * Must stay in sync with BackupPostsCommand::VERSION.
     */
    private const SUPPORTED_VERSION = 1;

    public function handle(): int
    {
        $inputPath = $this->resolveInputPath();

        if (! is_file($inputPath)) {
            $this->error("Bundle file not found: {$inputPath}");

            return self::FAILURE;
        }

        /** @var mixed $bundle */
        $bundle = json_decode((string) file_get_contents($inputPath), true);

        if (! is_array($bundle) || ! isset($bundle['posts']) || ! is_array($bundle['posts'])) {
            $this->error('Bundle JSON is empty, invalid, or missing the "posts" section.');

            return self::FAILURE;
        }

        $version = (int) ($bundle['version'] ?? 0);
        if ($version !== self::SUPPORTED_VERSION) {
            $this->error("Unsupported bundle version {$version}. This command supports version ".self::SUPPORTED_VERSION.'.');

            return self::FAILURE;
        }

        $ownerId = (int) $this->option('owner-id');
        if (! DB::table('users')->where('id', $ownerId)->exists()) {
            $this->error("Owner user #{$ownerId} does not exist in this domain.");

            return self::FAILURE;
        }

        $filesDir = $this->resolveFilesDir($inputPath, is_string($bundle['files_dir'] ?? null) ? $bundle['files_dir'] : null);

        /** @var array<int, array<string, mixed>> $fileRecords */
        $fileRecords = is_array($bundle['files'] ?? null) ? $bundle['files'] : [];
        /** @var array<int, array<string, mixed>> $categoryRecords */
        $categoryRecords = is_array($bundle['categories'] ?? null) ? $bundle['categories'] : [];
        /** @var array<int, array<string, mixed>> $keywordSetRecords */
        $keywordSetRecords = is_array($bundle['keyword_sets'] ?? null) ? $bundle['keyword_sets'] : [];
        /** @var array<int, array<string, mixed>> $postRecords */
        $postRecords = $bundle['posts'];

        $stats = [
            'files_created' => 0,
            'files_reused' => 0,
            'files_missing_source' => 0,
            'files_copied' => 0,
            'categories_created' => 0,
            'categories_reused' => 0,
            'keyword_sets_created' => 0,
            'keyword_sets_reused' => 0,
            'posts_created' => 0,
            'posts_skipped' => 0,
            'pivots_created' => 0,
        ];

        DB::transaction(function () use ($fileRecords, $categoryRecords, $keywordSetRecords, $postRecords, $ownerId, $filesDir, &$stats): void {
            $fileMap = $this->importFiles($fileRecords, $ownerId, $filesDir, $stats);
            $categoryMap = $this->importCategories($categoryRecords, $ownerId, $stats);
            $keywordSetMap = $this->importKeywordSets($keywordSetRecords, $ownerId, $stats);
            $this->importPosts($postRecords, $fileMap, $categoryMap, $keywordSetMap, $ownerId, $stats);
        });

        $this->info('Import completed.');
        $this->line('Media backup folder: '.$filesDir);
        $this->line('Owner (created_by/updated_by/user_id): '.$ownerId);
        $this->line('Files created: '.$stats['files_created'].' | reused: '.$stats['files_reused'].' | physical files copied: '.$stats['files_copied']);
        if ($stats['files_missing_source'] > 0) {
            $this->warn('Files missing from the backup folder (row created, no physical file): '.$stats['files_missing_source']);
        }
        $this->line('Categories created: '.$stats['categories_created'].' | reused: '.$stats['categories_reused']);
        $this->line('Keyword sets created: '.$stats['keyword_sets_created'].' | reused: '.$stats['keyword_sets_reused']);
        $this->line('Posts created: '.$stats['posts_created'].' | skipped (slug exists): '.$stats['posts_skipped']);
        $this->line('Post ↔ keyword-set links created: '.$stats['pivots_created']);

        return self::SUCCESS;
    }

    /**
     * @param  array<int, array<string, mixed>>  $fileRecords
     * @param  array<string, int>  $stats
     * @return array<string, int> Map of backup_key => File id in this domain.
     */
    private function importFiles(array $fileRecords, int $ownerId, string $filesDir, array &$stats): array
    {
        $map = [];

        foreach ($fileRecords as $record) {
            $key = (string) ($record['backup_key'] ?? '');
            $path = (string) ($record['path'] ?? '');
            if ($key === '' || $path === '') {
                continue;
            }

            $disk = (string) ($record['disk'] ?? 'public');
            $backupRelativePath = (string) ($record['backup_relative_path'] ?? ($disk.'/'.ltrim($path, '/')));

            $this->copyMediaFromBackup($filesDir, $backupRelativePath, $disk, $path, $stats);

            /** @var File|null $existing */
            $existing = File::query()->where('path', $path)->first();

            if ($existing !== null) {
                $map[$key] = (int) $existing->id;
                $stats['files_reused']++;

                continue;
            }

            $file = File::query()->create([
                'user_id' => $ownerId,
                'disk' => $disk,
                'file_name' => (string) ($record['file_name'] ?? basename($path)),
                'original_name' => (string) ($record['original_name'] ?? basename($path)),
                'mime_type' => (string) ($record['mime_type'] ?? 'application/octet-stream'),
                'size' => max(0, (int) ($record['size'] ?? 0)),
                'path' => $path,
                'alt_text' => $record['alt_text'] ?? null,
            ]);

            $map[$key] = (int) $file->id;
            $stats['files_created']++;
        }

        return $map;
    }

    /**
     * Copy a physical media file from the backup folder into its original storage location.
     *
     * @param  array<string, int>  $stats
     */
    private function copyMediaFromBackup(string $filesDir, string $backupRelativePath, string $disk, string $path, array &$stats): void
    {
        $source = $filesDir.DIRECTORY_SEPARATOR.$backupRelativePath;

        if (! is_file($source)) {
            $stats['files_missing_source']++;
            $this->warn("Media file missing from backup folder: {$backupRelativePath}");

            return;
        }

        if (Storage::disk($disk)->exists($path) && ! (bool) $this->option('overwrite-media')) {
            return;
        }

        Storage::disk($disk)->put($path, (string) file_get_contents($source));
        $stats['files_copied']++;
    }

    /**
     * @param  array<int, array<string, mixed>>  $categoryRecords
     * @param  array<string, int>  $stats
     * @return array<string, int> Map of backup_key => Category id in this domain.
     */
    private function importCategories(array $categoryRecords, int $ownerId, array &$stats): array
    {
        $map = [];

        foreach ($categoryRecords as $record) {
            $key = (string) ($record['backup_key'] ?? '');
            if ($key === '') {
                continue;
            }

            $name = (string) ($record['name'] ?? '');

            /** @var Category|null $existing */
            $existing = $name !== '' ? Category::query()->where('name', $name)->first() : null;

            if ($existing !== null) {
                $map[$key] = (int) $existing->id;
                $stats['categories_reused']++;

                continue;
            }

            $category = Category::query()->create([
                'name' => $name !== '' ? $name : 'Imported category',
                'description' => $record['description'] ?? null,
                'created_by' => $ownerId,
                'updated_by' => $ownerId,
            ]);

            $map[$key] = (int) $category->id;
            $stats['categories_created']++;
        }

        return $map;
    }

    /**
     * @param  array<int, array<string, mixed>>  $keywordSetRecords
     * @param  array<string, int>  $stats
     * @return array<string, int> Map of backup_key => KeywordSet id in this domain.
     */
    private function importKeywordSets(array $keywordSetRecords, int $ownerId, array &$stats): array
    {
        $map = [];

        foreach ($keywordSetRecords as $record) {
            $key = (string) ($record['backup_key'] ?? '');
            if ($key === '') {
                continue;
            }

            $keywords = is_array($record['keywords'] ?? null) ? array_values($record['keywords']) : [];
            $encodedKeywords = json_encode($keywords, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            /** @var KeywordSet|null $existing */
            $existing = KeywordSet::query()->where('keywords', $encodedKeywords)->first();

            if ($existing !== null) {
                $map[$key] = (int) $existing->id;
                $stats['keyword_sets_reused']++;

                continue;
            }

            $keywordSet = KeywordSet::query()->create([
                'name' => mb_substr((string) ($record['name'] ?? 'Imported keyword set'), 0, 255),
                'keywords' => $keywords,
                'created_by' => $ownerId,
                'updated_by' => $ownerId,
            ]);

            $map[$key] = (int) $keywordSet->id;
            $stats['keyword_sets_created']++;
        }

        return $map;
    }

    /**
     * @param  array<int, array<string, mixed>>  $postRecords
     * @param  array<string, int>  $fileMap
     * @param  array<string, int>  $categoryMap
     * @param  array<string, int>  $keywordSetMap
     * @param  array<string, int>  $stats
     */
    private function importPosts(array $postRecords, array $fileMap, array $categoryMap, array $keywordSetMap, int $ownerId, array &$stats): void
    {
        foreach ($postRecords as $record) {
            $slug = (string) ($record['slug'] ?? '');
            if ($slug === '') {
                continue;
            }

            /** @var Post|null $existing */
            $existing = Post::query()->where('slug', $slug)->first();

            if ($existing !== null) {
                $stats['posts_skipped']++;
                $post = $existing;
            } else {
                $featureMediaKey = $record['feature_media_key'] ?? null;
                $featureMediaId = is_string($featureMediaKey) ? ($fileMap[$featureMediaKey] ?? null) : null;

                $categoryKey = $record['category_key'] ?? null;
                $categoryId = is_string($categoryKey) ? ($categoryMap[$categoryKey] ?? null) : null;

                $post = Post::query()->create([
                    'title' => (string) ($record['title'] ?? ''),
                    'slug' => $slug,
                    'lang' => $record['lang'] ?? null,
                    'note' => $record['note'] ?? null,
                    'description' => $record['description'] ?? null,
                    'content' => $record['content'] ?? null,
                    'feature_media_id' => $featureMediaId,
                    'status' => $this->normalizeStatus($record['status'] ?? null),
                    'is_hidden' => (bool) ($record['is_hidden'] ?? false),
                    'type' => $this->normalizeType($record['type'] ?? null),
                    'category_id' => $categoryId,
                    'created_by' => $ownerId,
                    'updated_by' => $ownerId,
                    'published_at' => $this->normalizePublishedAt($record['published_at'] ?? null),
                ]);
                $stats['posts_created']++;
            }

            $this->syncKeywordSets($post, $record['keyword_set_keys'] ?? [], $keywordSetMap, $stats);
            $this->assignOwner($post, $ownerId);
        }
    }

    /**
     * @param  array<string, int>  $keywordSetMap
     * @param  array<string, int>  $stats
     */
    private function syncKeywordSets(Post $post, mixed $keywordSetKeys, array $keywordSetMap, array &$stats): void
    {
        if (! is_array($keywordSetKeys) || $keywordSetKeys === []) {
            return;
        }

        $existingIds = PostKeywordSet::query()
            ->where('post_id', (int) $post->id)
            ->pluck('keyword_set_id')
            ->map(static fn (mixed $id): int => (int) $id)
            ->all();

        foreach ($keywordSetKeys as $keywordSetKey) {
            if (! is_string($keywordSetKey)) {
                continue;
            }

            $keywordSetId = $keywordSetMap[$keywordSetKey] ?? null;
            if ($keywordSetId === null || in_array($keywordSetId, $existingIds, true)) {
                continue;
            }

            PostKeywordSet::query()->create([
                'post_id' => (int) $post->id,
                'keyword_set_id' => $keywordSetId,
            ]);
            $existingIds[] = $keywordSetId;
            $stats['pivots_created']++;
        }
    }

    private function assignOwner(Post $post, int $ownerId): void
    {
        PostUser::query()->firstOrCreate([
            'post_id' => (int) $post->id,
            'user_id' => $ownerId,
        ]);
    }

    private function normalizeStatus(mixed $status): string
    {
        $status = is_string($status) ? $status : '';

        return in_array($status, PostStatus::values(), true) ? $status : PostStatus::DRAFT->value;
    }

    private function normalizeType(mixed $type): ?string
    {
        if (! is_string($type) || $type === '') {
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
            return Carbon::parse($publishedAt);
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolveInputPath(): string
    {
        $input = (string) ($this->option('input') ?? '');

        return trim($input) !== '' ? $input : storage_path('app/backup-new/posts-bundle.json');
    }

    private function resolveFilesDir(string $inputPath, ?string $bundleFilesDir): string
    {
        $filesDir = (string) ($this->option('files-dir') ?? '');
        if (trim($filesDir) !== '') {
            return rtrim($filesDir, DIRECTORY_SEPARATOR);
        }

        $folderName = ($bundleFilesDir !== null && trim($bundleFilesDir) !== '') ? trim($bundleFilesDir) : 'files';

        return dirname($inputPath).DIRECTORY_SEPARATOR.$folderName;
    }
}

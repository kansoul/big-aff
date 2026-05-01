<?php

namespace App\Console\Commands;

use App\Models\AdsLink;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateAdsLinkBackupCommand extends Command
{
    protected $signature = 'backup:migrate-ads-links
        {--path= : Absolute path to ads-links-backup.json}
        {--truncate : Truncate ads_links table before importing}';

    protected $description = 'Migrate ads-links backup JSON into ads_links table';

    private const BATCH_SIZE = 200;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/ads-links-backup.json');

        if (! is_file($path)) {
            $this->error("Backup file not found: {$path}");

            return self::FAILURE;
        }

        /** @var array<int, array<string, mixed>> $records */
        $records = json_decode((string) file_get_contents($path), true) ?? [];

        if ($records === []) {
            $this->error('Backup JSON is empty or invalid.');

            return self::FAILURE;
        }

        if ((bool) $this->option('truncate')) {
            AdsLink::query()->truncate();
            $this->warn('ads_links table truncated.');
        }

        $siteMap = $this->buildSiteMap();
        $postMap = $this->buildPostMap();
        $userMap = $this->buildUserEmailMap();
        $postKeywordMap = $this->buildPostKeywordMap();
        $siteStyleMap = $this->buildSiteStyleMap();

        $imported = 0;
        $skipped = 0;
        $now = now();
        $rows = [];

        foreach ($records as $record) {
            $slug = (string) ($record['slug'] ?? '');

            if ($slug === '') {
                $skipped++;

                continue;
            }

            $siteUrl = rtrim((string) ($record['site_id'] ?? ''), '/');
            $siteId = $siteMap[$siteUrl] ?? null;

            $postTitle = (string) ($record['post_id'] ?? '');
            $postId = $postMap[$postTitle] ?? null;

            $keywordSetId = $postId !== null ? ($postKeywordMap[$postId] ?? null) : null;
            $styleCode = $siteId !== null ? ($siteStyleMap[$siteId] ?? null) : null;

            $createdByEmail = (string) ($record['created_by'] ?? '');
            $updatedByEmail = (string) ($record['updated_by'] ?? '');
            $createdBy = $userMap[$createdByEmail] ?? null;
            $updatedBy = $userMap[$updatedByEmail] ?? null;

            $trackingIds = $record['tracking_ids'] ?? null;

            $rows[] = [
                'site_id' => $siteId,
                'post_id' => $postId,
                'slug' => $slug,
                'rac' => $record['rac'] ?? null,
                'note' => $record['note'] ?? null,
                'is_hidden' => (bool) ($record['is_hidden'] ?? false),
                'channel_code' => null,
                'style_code' => $styleCode,
                'keyword_set_id' => $keywordSetId,
                'tracking_ids' => is_array($trackingIds) ? json_encode($trackingIds) : null,
                'is_old' => true,
                'created_by' => $createdBy,
                'updated_by' => $updatedBy,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($rows) >= self::BATCH_SIZE) {
                AdsLink::query()->insert($rows);
                $imported += count($rows);
                $rows = [];
            }
        }

        if ($rows !== []) {
            AdsLink::query()->insert($rows);
            $imported += count($rows);
        }

        $this->info('Import completed.');
        $this->line("Imported: {$imported}");
        $this->warn("Skipped (no slug): {$skipped}");

        return self::SUCCESS;
    }

    /**
     * @return array<string, int> url => site_id
     */
    private function buildSiteMap(): array
    {
        return DB::table('sites')
            ->select(['id', 'url'])
            ->whereNull('deleted_at')
            ->get()
            ->mapWithKeys(fn (object $row): array => [rtrim((string) $row->url, '/') => (int) $row->id])
            ->all();
    }

    /**
     * @return array<string, int> title => post_id
     */
    private function buildPostMap(): array
    {
        return DB::table('posts')
            ->select(['id', 'title'])
            ->whereNull('deleted_at')
            ->get()
            ->mapWithKeys(fn (object $row): array => [(string) $row->title => (int) $row->id])
            ->all();
    }

    /**
     * @return array<string, int> email => user_id
     */
    private function buildUserEmailMap(): array
    {
        return DB::table('users')
            ->select(['id', 'email'])
            ->get()
            ->mapWithKeys(fn (object $row): array => [(string) $row->email => (int) $row->id])
            ->all();
    }

    /**
     * @return array<int, int> post_id => first keyword_set_id
     */
    private function buildPostKeywordMap(): array
    {
        return DB::table('post_keyword_sets')
            ->select(['post_id', DB::raw('MIN(keyword_set_id) as keyword_set_id')])
            ->groupBy('post_id')
            ->get()
            ->mapWithKeys(fn (object $row): array => [(int) $row->post_id => (int) $row->keyword_set_id])
            ->all();
    }

    /**
     * @return array<int, string|null> site_id => default_style
     */
    private function buildSiteStyleMap(): array
    {
        return DB::table('sites')
            ->select(['id', 'settings'])
            ->whereNull('deleted_at')
            ->whereNotNull('settings')
            ->get()
            ->mapWithKeys(function (object $row): array {
                $settings = json_decode((string) $row->settings, true);
                $style = is_array($settings) ? ($settings['default_style'] ?? null) : null;

                return [(int) $row->id => $style !== null ? (string) $style : null];
            })
            ->all();
    }
}

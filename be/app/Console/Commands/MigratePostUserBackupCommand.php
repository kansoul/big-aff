<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\PostUser;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigratePostUserBackupCommand extends Command
{
    protected $signature = 'backup:migrate-post-users
        {--path= : Absolute path to posts-by-title-creators.json}
        {--dry-run : Preview changes without writing to the database}';

    protected $description = 'Seed post_user pivot from posts-by-title-creators.json using title → post and email → user lookups';

    private const BATCH_SIZE = 500;

    public function handle(): int
    {
        $path = $this->option('path') ?: storage_path('app/backup/posts-by-title-creators.json');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        /** @var array<int, array{title: string, creators: array<int, string>}> $records */
        $records = json_decode((string) file_get_contents($path), true) ?? [];

        if ($records === []) {
            $this->error('JSON is empty or invalid.');

            return self::FAILURE;
        }

        $isDryRun = (bool) $this->option('dry-run');

        if ($isDryRun) {
            $this->warn('DRY RUN — no changes will be written.');
        }

        $postByTitle = Post::query()
            ->select(['id', 'title', 'created_by'])
            ->get()
            ->keyBy('title');

        $userByEmail = User::query()
            ->select(['id', 'email'])
            ->get()
            ->keyBy('email')
            ->map(fn (User $u): int => (int) $u->id);

        $existingPairs = PostUser::query()
            ->select(['post_id', 'user_id'])
            ->get()
            ->mapWithKeys(fn (PostUser $pu): array => ["{$pu->post_id}:{$pu->user_id}" => true])
            ->all();

        $rows = [];
        $now = now();
        $inserted = 0;
        $skippedNoPost = 0;
        $skippedNoUser = 0;
        $skippedDuplicate = 0;
        $createdByUpdated = 0;

        foreach ($records as $record) {
            $title = trim((string) ($record['title'] ?? ''));
            $creators = $record['creators'] ?? [];

            /** @var Post|null $post */
            $post = $postByTitle[$title] ?? null;

            if ($post === null) {
                $skippedNoPost++;

                continue;
            }

            $postId = (int) $post->id;
            $firstCreatorEmail = trim((string) ($creators[0] ?? ''));
            $firstUserId = $firstCreatorEmail !== '' ? ($userByEmail[$firstCreatorEmail] ?? null) : null;

            if ($firstUserId !== null) {
                if (! $isDryRun) {
                    Post::query()->where('id', $postId)->update(['created_by' => $firstUserId]);
                }
                $createdByUpdated++;
            }

            foreach ($creators as $email) {
                $email = trim((string) $email);
                $userId = $userByEmail[$email] ?? null;

                if ($userId === null) {
                    $skippedNoUser++;

                    continue;
                }

                $key = "{$postId}:{$userId}";

                if (isset($existingPairs[$key])) {
                    $skippedDuplicate++;

                    continue;
                }

                $existingPairs[$key] = true;
                $rows[] = [
                    'post_id' => $postId,
                    'user_id' => $userId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if (! $isDryRun && count($rows) >= self::BATCH_SIZE) {
                    DB::table('post_user')->insert($rows);
                    $inserted += count($rows);
                    $rows = [];
                }
            }
        }

        if (! $isDryRun && $rows !== []) {
            DB::table('post_user')->insert($rows);
            $inserted += count($rows);
        } elseif ($isDryRun) {
            $inserted = count($rows);
        }

        $this->info('Done.');
        $this->line("post_user inserted: {$inserted}");
        $this->line("posts.created_by updated: {$createdByUpdated}");
        $this->warn("Skipped — post not found by title: {$skippedNoPost}");
        $this->warn("Skipped — user not found by email: {$skippedNoUser}");
        $this->warn("Skipped — duplicate pair: {$skippedDuplicate}");

        return self::SUCCESS;
    }
}

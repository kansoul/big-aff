<?php

namespace App\Actions\Post;

use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Post
    {
        return DB::transaction(function () use ($data): Post {
            $keywordSetIds = $data['keyword_set_ids'] ?? [];
            unset($data['keyword_set_ids']);
            unset($data['slug']);

            $data['created_by'] = Auth::id();
            $data['slug'] = $this->generateUniqueSlug($data['title']);

            $post = Post::create($data);

            $post->assignedUsers()->attach(Auth::id());

            if (! empty($keywordSetIds)) {
                $post->keywordSets()->sync($keywordSetIds);
            }

            return $post;
        });
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title);

        $existing = Post::where('slug', $base)
            ->orWhere(function ($q) use ($base): void {
                $q->where('slug', 'like', $base.'-%')
                    ->whereRaw('LENGTH(slug) = ?', [strlen($base) + 2]);
            })
            ->pluck('slug')
            ->flip()
            ->all();

        if (! isset($existing[$base])) {
            return $base;
        }

        foreach (range('a', 'z') as $suffix) {
            $slug = $base.'-'.$suffix;
            if (! isset($existing[$slug])) {
                return $slug;
            }
        }

        return $base.'-'.uniqid();
    }
}

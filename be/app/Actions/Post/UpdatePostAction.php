<?php

namespace App\Actions\Post;

use App\Models\Post;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UpdatePostAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Post $post, array $data): Post
    {
        OwnershipFilter::forAuthUser()->authorizePost($post);

        return DB::transaction(function () use ($post, $data): Post {
            $keywordSetIds = array_key_exists('keyword_set_ids', $data) ? $data['keyword_set_ids'] : false;
            unset($data['keyword_set_ids']);
            unset($data['slug']);

            if (isset($data['title'])) {
                $data['slug'] = $this->generateUniqueSlug($data['title'], $post->id);
            }

            $data['updated_by'] = Auth::id();
            $post->update($data);

            if ($keywordSetIds !== false) {
                $post->keywordSets()->sync($keywordSetIds ?? []);
            }

            return $post->fresh(['featureMedia', 'category']);
        });
    }

    private function generateUniqueSlug(string $title, int $excludeId): string
    {
        $base = Str::slug($title);

        $existing = Post::where('id', '!=', $excludeId)
            ->where(function ($q) use ($base): void {
                $q->where('slug', $base)
                    ->orWhere(function ($q2) use ($base): void {
                        $q2->where('slug', 'like', $base.'-%')
                            ->whereRaw('LENGTH(slug) = ?', [strlen($base) + 2]);
                    });
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

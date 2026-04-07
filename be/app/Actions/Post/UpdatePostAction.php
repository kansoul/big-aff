<?php

namespace App\Actions\Post;

use App\Actions\File\StoreFileAction;
use App\Enums\DiskEnum;
use App\Models\File;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdatePostAction
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Post $post, array $data): Post
    {
        $data['updated_by'] = Auth::id();

        $uploadedFile = null;

        if (isset($data['feature_media'])) {
            $uploadedFile = $this->storeFileAction->execute([
                'disk' => DiskEnum::S3,
                'file' => $data['feature_media'],
                'directory' => 'posts/feature-media',
            ]);
            $data['feature_media_id'] = $uploadedFile->id;
            unset($data['feature_media']);
        } elseif (array_key_exists('feature_media', $data)) {
            $data['feature_media_id'] = null;
            unset($data['feature_media']);
        }

        try {
            return DB::transaction(function () use ($post, $data) {
                $post->update($data);

                return $post->fresh(['featureMedia', 'category']);
            });
        } catch (\Throwable $e) {
            if ($uploadedFile instanceof File) {
                $uploadedFile->delete();
            }
            throw $e;
        }
    }
}

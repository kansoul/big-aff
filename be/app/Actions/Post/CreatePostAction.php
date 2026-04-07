<?php

namespace App\Actions\Post;

use App\Actions\File\StoreFileAction;
use App\Enums\DiskEnum;
use App\Models\File;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreatePostAction
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Post
    {
        $data['created_by'] = Auth::id();

        $uploadedFile = null;

        if (isset($data['feature_media'])) {
            $uploadedFile = $this->storeFileAction->execute([
                'disk' => DiskEnum::S3,
                'file' => $data['feature_media'],
                'directory' => 'posts/feature-media',
            ]);
            $data['feature_media_id'] = $uploadedFile->id;
            unset($data['feature_media']);
        }

        try {
            return DB::transaction(fn () => Post::create($data));
        } catch (\Throwable $e) {
            if ($uploadedFile instanceof File) {
                $uploadedFile->delete();
            }
            throw $e;
        }
    }
}

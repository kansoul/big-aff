<?php

namespace App\Actions\Category;

use App\Actions\File\StoreFileAction;
use App\Enums\DiskEnum;
use App\Models\Category;
use App\Models\File;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateCategoryAction
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction
    ) {}

    public function execute(Category $category, array $data): Category
    {
        $uploadedFile = null;

        if (isset($data['feature_image'])) {
            $uploadedFile = $this->storeFileAction->execute([
                'disk' => DiskEnum::S3,
                'file' => $data['feature_image'],
                'directory' => 'categories',
            ]);
            $data['feature_media_id'] = $uploadedFile->id;
            unset($data['feature_image']);
        }

        $data['updated_by'] = Auth::id();

        try {
            return DB::transaction(function () use ($category, $data) {
                $category->update($data);

                return $category->fresh(['featureMedia', 'parent']);
            });
        } catch (\Throwable $e) {
            if ($uploadedFile instanceof File) {
                $uploadedFile->delete();
            }
            throw $e;
        }
    }
}

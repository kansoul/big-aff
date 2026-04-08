<?php

namespace App\Actions\Site;

use App\Actions\File\DeleteFileAction;
use App\Actions\File\StoreFileAction;
use App\Enums\SiteStatus;
use App\Models\File;
use App\Models\Site;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateSiteAction
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction,
        private readonly DeleteFileAction $deleteFileAction,
    ) {}

    public function execute(array $data): Site
    {
        $logo = null;
        $favicon = null;

        try {
            if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
                $logo = $this->storeFileAction->execute([
                    'file' => $data['logo'],
                    'directory' => 'sites/logos',
                ]);
            }

            if (isset($data['favicon']) && $data['favicon'] instanceof UploadedFile) {
                $favicon = $this->storeFileAction->execute([
                    'file' => $data['favicon'],
                    'directory' => 'sites/favicons',
                ]);
            }

            return DB::transaction(function () use ($data, $logo, $favicon): Site {
                $userId = Auth::id();

                return Site::query()->create([
                    'name' => $data['name'],
                    'url' => $data['url'],
                    'secret_key' => Str::random(40),
                    'logo_id' => $logo?->id,
                    'favicon_id' => $favicon?->id,
                    'settings' => $data['settings'] ?? null,
                    'description' => $data['description'] ?? null,
                    'status' => SiteStatus::Active->value,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
            });
        } catch (\Throwable $e) {
            foreach (array_filter([$logo, $favicon]) as $file) {
                /** @var File $file */
                $this->deleteFileAction->execute($file);
            }

            throw $e;
        }
    }
}

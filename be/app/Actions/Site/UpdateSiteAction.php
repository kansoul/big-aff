<?php

namespace App\Actions\Site;

use App\Actions\File\StoreFileAction;
use App\Models\Site;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateSiteAction
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Site $site, array $data): Site
    {
        return DB::transaction(function () use ($site, $data): Site {
            if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
                $logo = $this->storeFileAction->execute([
                    'file' => $data['logo'],
                    'disk' => $data['logo_disk'] ?? null,
                    'directory' => 'sites/logos',
                ]);
                $data['logo_id'] = $logo->id;
            }

            if (isset($data['favicon']) && $data['favicon'] instanceof UploadedFile) {
                $favicon = $this->storeFileAction->execute([
                    'file' => $data['favicon'],
                    'disk' => $data['favicon_disk'] ?? null,
                    'directory' => 'sites/favicons',
                ]);
                $data['favicon_id'] = $favicon->id;
            }

            $updateData = collect($data)
                ->except(['logo', 'logo_disk', 'favicon', 'favicon_disk'])
                ->merge(['updated_by' => Auth::id()])
                ->all();

            $site->update($updateData);

            return $site->fresh(['logo', 'favicon']) ?? $site;
        });
    }
}

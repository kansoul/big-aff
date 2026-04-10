<?php

namespace App\Http\Resources\Site;

use App\Models\File;
use App\Models\Site;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Site
 */
class SiteConfigResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $domain = $request->header('x-internal-site');
        $domain = 'https://'.preg_replace('/^https?:\/\//', '', rtrim($domain, '/'));

        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'description' => $this->description,
            'status' => $this->status,
            'settings' => $this->settings,
            'logo' => $this->getMediaUrl($domain, $this->logo),
            'favicon' => $this->getMediaUrl($domain, $this->favicon),
        ];
    }

    /**
     * Get feature media URL.
     */
    private function getMediaUrl(string $domain, ?File $file): ?string
    {
        if (empty($file)) {
            return null;
        }

        return $domain.'/'.ltrim($file->path, '/');
    }
}

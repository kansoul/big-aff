<?php

namespace App\Actions\Pixel;

use App\Models\Account;
use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Validation\ValidationException;

class SyncPixelsAction
{
    /** @param array<string, mixed> $trackingIds */
    public function execute(array $trackingIds): void
    {
        $advertiserIds = $trackingIds['tiktokid'] ?? [];
        $pixelIds = $trackingIds['tiktok_pixel_id'] ?? [];

        foreach ($advertiserIds as $index => $advertiserId) {
            $pixelId = $pixelIds[$index] ?? null;
            if (! $pixelId) {
                continue;
            }

            $account = Account::query()
                ->where('account_id', $advertiserId)
                ->where('ads_type', 'tiktok')
                ->first();

            if (! $account) {
                throw ValidationException::withMessages([
                    'tiktokid' => ["TikTok account {$advertiserId} does not exist."],
                ]);
            }

            OwnershipFilter::forAuthUser()->authorizeAccount($account);

            Pixel::query()->firstOrCreate(
                ['pixel_id' => $pixelId],
                ['created_by' => auth()->id(), 'updated_by' => auth()->id()],
            );
        }
    }
}

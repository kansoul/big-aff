<?php

namespace App\Actions\AdsLink;

use App\Actions\Pixel\SyncPixelsAction;
use App\Models\AdsLink;
use App\Models\Pixel;
use App\Services\AdsLink\RACValidationService;
use App\Support\OwnerResource\AdsLinkOwnerResource;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateAdsLinkAction
{
    public function __construct(
        private readonly RACValidationService $racValidationService,
        private readonly SyncPixelsAction $syncPixelsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdsLink $adsLink, array $data): AdsLink
    {
        (new AdsLinkOwnerResource)->authorize($adsLink);

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $racValidation = $this->racValidationService->validateRAC($data['rac']);
            if (! $racValidation['is_valid']) {
                throw ValidationException::withMessages([
                    'rac' => [$racValidation['warning']],
                ]);
            }
        }

        $trackingIds = $adsLink->tracking_ids ?? [];
        if (! empty($data['pixel_id'])) {
            $pixel = Pixel::query()->with('account')->findOrFail($data['pixel_id']);
            if ($pixel->account_id !== (int) $data['account_id']) {
                throw ValidationException::withMessages(['pixel_id' => ['Pixel does not belong to the selected account.']]);
            }
            OwnershipFilter::forAuthUser()->authorizeAccount($pixel->account);
            $trackingIds['tiktokid'] = [$pixel->account->account_id];
            $trackingIds['tiktok_pixel_id'] = [$pixel->pixel_id];
        }

        if (array_key_exists('googleid', $data)) {
            if (! empty($data['googleid'])) {
                $trackingIds['googleid'] = $this->csvValues($data['googleid']);
            } else {
                unset($trackingIds['googleid']);
            }
        }

        if (array_key_exists('tiktokid', $data)) {
            if (! empty($data['tiktokid'])) {
                $trackingIds['tiktokid'] = $this->csvValues($data['tiktokid']);
            } else {
                unset($trackingIds['tiktokid']);
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        if (array_key_exists('tiktok_pixel_id', $data)) {
            if (! empty($data['tiktok_pixel_id'])) {
                $trackingIds['tiktok_pixel_id'] = $this->csvValues($data['tiktok_pixel_id']);
            } else {
                unset($trackingIds['tiktok_pixel_id']);
            }
        }

        $payload = [
            'tracking_ids' => $trackingIds,
            'updated_by' => Auth::id(),
        ];
        if (array_key_exists('account_id', $data)) {
            $payload['account_id'] = $data['account_id'];
        }
        if (array_key_exists('pixel_id', $data)) {
            $payload['pixel_id'] = $data['pixel_id'];
        }

        if (array_key_exists('rac', $data) && $data['rac'] !== null) {
            $payload['rac'] = $data['rac'];
        }

        if (array_key_exists('note', $data)) {
            $payload['note'] = $data['note'];
        }

        DB::transaction(function () use ($adsLink, $payload, $trackingIds): void {
            $this->syncPixelsAction->execute($trackingIds);
            $adsLink->update($payload);
        });

        return $adsLink->fresh();
    }

    /** @return array<int, string> */
    private function csvValues(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }
}

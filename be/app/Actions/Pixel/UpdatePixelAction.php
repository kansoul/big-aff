<?php

namespace App\Actions\Pixel;

use App\Models\BusinessCenter;
use App\Models\Pixel;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use App\Support\OwnerResource\PixelOwnerResource;
use Illuminate\Validation\ValidationException;

class UpdatePixelAction
{
    public function execute(Pixel $pixel, array $data): Pixel
    {
        (new PixelOwnerResource)->authorize($pixel);
        $businessCenter = BusinessCenter::query()->findOrFail($data['business_center_id']);
        (new BusinessCenterOwnerResource)->authorize($businessCenter);

        if ($businessCenter->ads_type !== $data['platform']) {
            throw ValidationException::withMessages([
                'business_center_id' => ['The business center platform must match the pixel platform.'],
            ]);
        }

        $pixel->update([...$data, 'updated_by' => auth()->id()]);

        return $pixel->fresh()->load('businessCenter');
    }
}

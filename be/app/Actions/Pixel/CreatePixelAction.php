<?php

namespace App\Actions\Pixel;

use App\Models\BusinessCenter;
use App\Models\Pixel;
use App\Support\OwnerResource\BusinessCenterOwnerResource;
use Illuminate\Validation\ValidationException;

class CreatePixelAction
{
    public function execute(array $data): Pixel
    {
        $businessCenter = BusinessCenter::query()->findOrFail($data['business_center_id']);
        (new BusinessCenterOwnerResource)->authorize($businessCenter);

        if ($businessCenter->ads_type !== $data['platform']) {
            throw ValidationException::withMessages([
                'business_center_id' => ['The business center platform must match the pixel platform.'],
            ]);
        }

        return Pixel::query()
            ->create([...$data, 'created_by' => auth()->id(), 'updated_by' => auth()->id()])
            ->load('businessCenter');
    }
}

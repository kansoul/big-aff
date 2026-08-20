<?php

namespace App\Http\Requests\Pixel;

use App\Enums\PixelPlatform;
use App\Enums\PixelStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePixelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pixel_id' => ['required', 'string', 'max:255', Rule::unique('pixels', 'pixel_id')->where('platform', $this->input('platform'))->ignore($this->route('pixel'))],
            'name' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::enum(PixelPlatform::class)],
            'business_center_id' => ['required', 'integer', Rule::exists('business_centers', 'id')->withoutTrashed()],
            'status' => ['required', Rule::enum(PixelStatus::class)],
        ];
    }
}

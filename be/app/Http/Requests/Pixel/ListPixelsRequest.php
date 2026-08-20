<?php

namespace App\Http\Requests\Pixel;

use App\Actions\Pixel\ListPixelsAction;
use App\Enums\PixelPlatform;
use App\Enums\PixelStatus;
use App\Http\Requests\Concerns\ValidatesPaginationQuery;
use App\Http\Requests\Concerns\ValidatesSortQuery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPixelsRequest extends FormRequest
{
    use ValidatesPaginationQuery, ValidatesSortQuery;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return array_merge(
            $this->paginationRules(),
            $this->sortRules(ListPixelsAction::ORDERABLE_COLUMNS),
            [
                'query' => ['nullable', 'string', 'max:255'],
                'platform' => ['nullable', Rule::enum(PixelPlatform::class)],
                'business_center_id' => ['nullable', 'integer', Rule::exists('business_centers', 'id')->withoutTrashed()],
                'status' => ['nullable', Rule::enum(PixelStatus::class)],
            ],
        );
    }
}

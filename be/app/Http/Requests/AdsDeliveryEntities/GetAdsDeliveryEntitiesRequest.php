<?php

namespace App\Http\Requests\AdsDeliveryEntities;

use App\Support\AdsDelivery\DeliveryEntityStatusDictionary;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GetAdsDeliveryEntitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'created_time_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'created_time_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:created_time_from'],
            'status' => ['sometimes', 'nullable', 'string', Rule::in(DeliveryEntityStatusDictionary::values())],
            'adset_id' => ['sometimes', 'nullable', 'string'],
            'adset_name' => ['sometimes', 'nullable', 'string'],
            'ad_id' => ['sometimes', 'nullable', 'string'],
            'ad_name' => ['sometimes', 'nullable', 'string'],
            'session_id' => ['sometimes', 'nullable', 'uuid'],
            'click_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'event_type' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}

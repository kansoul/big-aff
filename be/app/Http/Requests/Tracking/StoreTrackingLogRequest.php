<?php

namespace App\Http\Requests\Tracking;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StoreTrackingLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'session_id' => 'nullable|string|uuid',

            // Link tracking lookup
            'campaign_id' => 'required|string',

            // Event data
            'type' => [
                'required',
                'string',
                Rule::in([
                    'page_view',
                    'form_view',
                    'lead',
                    'ads_load_article_error',
                    'ads_load_search_error',
                    'ads_load_article_success',
                    'ads_load_search_success',
                ]),
            ],
            'eventType' => 'nullable|string|max:100',
            'page' => 'required|string|max:500',
            'ad_id' => 'nullable|string',
            'adset_id' => 'nullable|string',
            'event_time' => 'nullable|date',
            'query' => 'nullable|string',
            'keyword_clicked' => 'nullable|string|max:255',
            'load_time_ms' => 'nullable|integer|min:0',
            'container_type' => 'nullable|string|max:255',
            'payload' => 'nullable|array',
            'values' => 'nullable|array',
            'estimate_earning' => 'nullable|numeric|min:0',
            'page_views' => 'nullable|integer|min:0',
            'clicks' => 'nullable|integer|min:0',
            'ad_requests' => 'nullable|integer|min:0',
            'impressions' => 'nullable|integer|min:0',
            'ad_requests_rpm' => 'nullable|numeric|min:0',
            'impressions_rpm' => 'nullable|numeric|min:0',
            'cost_per_click' => 'nullable|numeric|min:0',
            'funnel_requests' => 'nullable|integer|min:0',
            'funnel_impressions' => 'nullable|integer|min:0',
            'funnel_clicks' => 'nullable|integer|min:0',
            'funnel_rpm' => 'nullable|numeric|min:0',

            // Session fields
            'ip_address' => 'nullable|string|max:45',
            'device' => 'nullable|string|max:20',
            'browser' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:2',
            'referrer' => 'nullable|string|max:2048',
            'user_agent' => 'nullable|string|max:1000',
            'is_bot' => 'nullable|boolean',
            'test' => 'nullable|string',
        ];
    }

    public function attributes(): array
    {
        return [
            'page' => 'page URL',
            'event_time' => 'event timestamp',
            'load_time_ms' => 'load time',
            'ip_address' => 'IP address',
            'user_agent' => 'user agent',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'type' => $this->input('type') ?: $this->input('eventType'),
            'event_time' => $this->event_time ?: now(),
            'ip_address' => $this->ip_address ?: $this->ip(),
            'user_agent' => $this->user_agent ?: $this->userAgent(),
            'is_bot' => $this->is_bot ?? $this->isBot(),
        ]);
    }

    private function isBot(): bool
    {
        $ua = strtolower($this->userAgent() ?? '');

        foreach (['bot', 'crawler', 'spider', 'scraper', 'headless'] as $keyword) {
            if (str_contains($ua, $keyword)) {
                return true;
            }
        }

        return false;
    }

    public function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
        ], 200));
    }
}

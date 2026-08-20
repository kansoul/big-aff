<?php

namespace App\Http\Requests\Tracking;

use App\Http\Requests\Lead\StoreLeadRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\In;

class StoreTrackingLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Event types handled by the tracking log endpoint. */
    public const TYPES = [
        'page_view',
        'redirect',
        'submit_form',
    ];

    public function rules(): array
    {
        $type = (string) $this->input('type');

        return [
            ...($type === 'submit_form' ? StoreLeadRequest::fieldRules() : []),

            // Public key the landing snippet carries; gates the whole endpoint.
            'key' => $this->trackingKeyRules(),

            // Everything is keyed on the session the snippet owns.
            'session_id' => 'nullable|string|uuid',

            // Link tracking lookup. The wizard steps run after the landing page,
            // where the params may no longer be around, so they stay optional.
            'campaign_id' => $type === 'page_view' ? 'required|string' : 'nullable|string',

            // Event data
            'type' => [
                'required',
                'string',
                Rule::in(self::TYPES),
            ],
            'eventType' => 'nullable|string|max:100',
            // Optional: there is only one page live, so it defaults to quickpayly.
            'page' => 'nullable|string|max:500',
            'utm_source' => 'nullable|string|max:64',
            // Ad network placement and external tracker (Voluum) ids.
            'placement' => 'nullable|string|max:64',
            'cpid' => 'nullable|string|max:64',
            'lpid' => 'nullable|string|max:64',

            // Ads click identifiers, captured from the landing URL on page_view.
            'gclid' => 'nullable|string|max:255',
            'wbraid' => 'nullable|string|max:255',
            'gbraid' => 'nullable|string|max:255',
            'ttclid' => 'nullable|string|max:255',
            'ad_id' => 'nullable|string',
            'adset_id' => 'nullable|string',
            'event_time' => 'nullable|date',
            'query' => 'nullable|string',
            'keyword_clicked' => 'nullable|string|max:255',
            'load_time_ms' => 'nullable|integer|min:0',
            'container_type' => 'nullable|string|max:255',
            'payload' => 'nullable|array',
            'values' => 'nullable|array',

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

    /**
     * The key is only enforced once one is configured, so existing landing
     * pages keep working until they are updated.
     *
     * @return list<string|In>
     */
    private function trackingKeyRules(): array
    {
        $key = (string) config('whitelist.tracking_key');

        return $key === ''
            ? ['nullable', 'string']
            : ['required', 'string', Rule::in([$key])];
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

    /** Attribution params that arrive from ad-network macros. */
    private const MACRO_FIELDS = [
        'campaign_id', 'adset_id', 'ad_id', 'placement', 'cpid', 'lpid',
        'gclid', 'wbraid', 'gbraid', 'ttclid', 'keyword_clicked', 'utm_source',
    ];

    protected function prepareForValidation(): void
    {
        $this->merge($this->withoutUnresolvedMacros());

        $this->merge([
            'type' => $this->input('type') ?: $this->input('eventType'),
            'event_time' => $this->event_time ?: now(),
            'ip_address' => $this->ip_address ?: $this->ip(),
            'user_agent' => $this->user_agent ?: $this->userAgent(),
            'is_bot' => $this->is_bot ?? $this->isBot(),
        ]);
    }

    /**
     * An ad network substitutes its macros at click time; a value still shaped
     * like `__CLICKID__` never got substituted and must not be stored.
     *
     * @return array<string, null>
     */
    private function withoutUnresolvedMacros(): array
    {
        $cleared = [];

        foreach (self::MACRO_FIELDS as $field) {
            $value = $this->input($field);

            if (is_string($value) && preg_match('/^__.*__$/', $value) === 1) {
                $cleared[$field] = null;
            }
        }

        return $cleared;
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

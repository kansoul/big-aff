<?php

namespace App\Http\Requests\AdsReport;

use App\Support\AdsReport\AdsReportAccess;
use Illuminate\Foundation\Http\FormRequest;

class GetAdsReportStatsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['team_ids', 'main_team_ids', 'ads_types', 'account_ids', 'campaign_ids'] as $key) {
            if ($this->has($key) && ! is_array($this->input($key))) {
                $normalized[$key] = [$this->input($key)];
            }
        }

        if ($this->filled('team_id') && ! $this->has('team_ids')) {
            $normalized['team_ids'] = [$this->input('team_id')];
        }

        if ($this->filled('ads_type') && ! $this->has('ads_types')) {
            $normalized['ads_types'] = [$this->input('ads_type')];
        }

        if ($this->filled('account_id') && ! $this->has('account_ids')) {
            $normalized['account_ids'] = [$this->input('account_id')];
        }

        if (AdsReportAccess::canUseMainTeams($this->user())) {
            if ($normalized !== []) {
                $this->merge($normalized);
            }

            return;
        }

        $this->merge([
            ...$normalized,
            'main_team_ids' => [],
        ]);
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'team_ids' => ['nullable', 'array'],
            'team_ids.*' => ['integer', 'exists:teams,id'],
            'main_team_ids' => ['nullable', 'array'],
            'main_team_ids.*' => ['integer', 'exists:main_teams,id'],
            'ads_types' => ['nullable', 'array'],
            'ads_types.*' => ['string', 'in:facebook,google'],
            'account_ids' => ['nullable', 'array'],
            'account_ids.*' => ['string', 'exists:accounts,account_id'],
            'campaign_ids' => ['nullable', 'array'],
            'campaign_ids.*' => ['string'],
        ];
    }
}

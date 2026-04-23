<?php

namespace App\Http\Requests\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCampaignRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeEntityIdsField();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'entity_type' => ['required', Rule::enum(EntityTypeEnum::class)],
            'is_active' => ['sometimes', 'boolean'],
            'expired_at' => ['nullable', 'date', 'after:now'],

            /** FB campaign_id values, or mixed FB ad_id / adset_id values (see entity_type). */
            'entity_ids' => ['required', 'array', 'min:1'],
            'entity_ids.*' => ['string'],

            // Campaign-level conditions
            'min_roi' => ['nullable', 'numeric', 'min:0'],
            'min_profit' => ['nullable', 'numeric'],
            'min_revenue' => ['nullable', 'numeric', 'min:0'],
            'min_spend' => ['nullable', 'numeric', 'min:0'],

            // Ad/Adset-level conditions
            'max_cpa' => ['nullable', 'numeric', 'min:0'],
            'min_conversion' => ['nullable', 'integer', 'min:0'],
            'min_spend_adset' => ['nullable', 'numeric', 'min:0'],

            // Time window
            'start_hour' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_hour' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $entity = $this->normalizedEntityTypeValue();
            if ($entity === null) {
                return;
            }

            foreach ($this->input('entity_ids', []) as $index => $id) {
                $id = is_string($id) ? trim($id) : (string) $id;
                if ($id === '') {
                    continue;
                }

                if ($entity === EntityTypeEnum::Campaign->value) {
                    if (! Campaign::query()->where('campaign_id', $id)->exists()) {
                        $v->errors()->add("entity_ids.{$index}", 'Invalid campaign ID: '.$id);
                    }

                    continue;
                }

                if ($entity === EntityTypeEnum::AdAdset->value) {
                    if (! AdsInsightsReport::query()->where('ad_id', $id)->exists()
                        && ! AdsetInsightsReport::query()->where('adset_id', $id)->exists()) {
                        $v->errors()->add("entity_ids.{$index}", 'Invalid ad or adset ID: '.$id);
                    }
                }
            }
        });
    }

    private function normalizeEntityIdsField(): void
    {
        $val = $this->input('entity_ids');
        if ($val === null) {
            return;
        }

        if (is_string($val) && trim($val) === '') {
            $this->merge(['entity_ids' => []]);

            return;
        }

        if (! is_string($val)) {
            return;
        }

        if (str_contains($val, "\n") || str_contains($val, "\r")) {
            $parts = preg_split('/\r\n|\r|\n/', $val) ?: [];
        } elseif (str_contains($val, ',')) {
            $parts = explode(',', $val);
        } else {
            $parts = [$val];
        }

        $ids = array_values(array_filter(array_map(
            static fn (string $s): string => trim($s),
            $parts,
        ), static fn (string $s): bool => $s !== ''));

        $this->merge(['entity_ids' => $ids]);
    }

    private function normalizedEntityTypeValue(): ?string
    {
        $raw = $this->input('entity_type');
        if ($raw instanceof EntityTypeEnum) {
            return $raw->value;
        }

        return is_string($raw) ? $raw : null;
    }
}

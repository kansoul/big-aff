<?php

namespace App\Http\Requests\CampaignRule;

use App\Enums\EntityTypeEnum;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use App\Models\CampaignRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCampaignRuleRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'entity_type' => ['sometimes', Rule::enum(EntityTypeEnum::class)],
            'is_active' => ['sometimes', 'boolean'],
            'expired_at' => ['sometimes', 'nullable', 'date', 'after:now'],

            'entity_ids' => ['sometimes', 'nullable', 'array'],
            'entity_ids.*' => ['string'],

            // Campaign-level conditions
            'min_roi' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_profit' => ['sometimes', 'nullable', 'numeric'],
            'min_revenue' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_spend' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            // Ad/Adset-level conditions
            'max_cpa' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'min_conversion' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'min_spend_adset' => ['sometimes', 'nullable', 'numeric', 'min:0'],

            // Time window
            'start_hour' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_hour' => ['sometimes', 'nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if (! $this->has('entity_ids')) {
                return;
            }

            /** @var CampaignRule|null $rule */
            $rule = $this->route('campaignRule');

            $effectiveEntity = $this->input('entity_type');
            if ($effectiveEntity instanceof EntityTypeEnum) {
                $effectiveEntity = $effectiveEntity->value;
            }
            if ($effectiveEntity === null && $rule instanceof CampaignRule) {
                $effectiveEntity = $rule->entity_type->value;
            }

            if ($effectiveEntity === null) {
                return;
            }

            $ids = $this->input('entity_ids', []);
            if (! is_array($ids)) {
                return;
            }

            $ids = array_values(array_filter(array_map(
                static fn (mixed $item): string => is_string($item) ? trim($item) : (string) $item,
                $ids,
            ), static fn (string $id): bool => $id !== ''));

            foreach ($ids as $index => $id) {
                if ($effectiveEntity === EntityTypeEnum::Campaign->value) {
                    if (! Campaign::query()->where('campaign_id', $id)->exists()) {
                        $v->errors()->add("entity_ids.{$index}", 'Invalid campaign ID: '.$id);
                    }

                    continue;
                }

                if ($effectiveEntity === EntityTypeEnum::AdAdset->value) {
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
        if (! $this->has('entity_ids')) {
            return;
        }

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
}

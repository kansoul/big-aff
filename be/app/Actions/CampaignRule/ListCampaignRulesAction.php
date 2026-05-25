<?php

namespace App\Actions\CampaignRule;

use App\Models\CampaignRule;
use App\Support\OwnerResource\CampaignRuleOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCampaignRulesAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'title',
        'entity_type',
        'is_active',
        'expired_at',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = CampaignRule::query()->with(['user', 'applyRules']);
        (new CampaignRuleOwnerResource)->applyTo($query);

        if (! empty($filters['keyword'])) {
            $keyword = addcslashes((string) $filters['keyword'], '%_\\');

            $query->where(function ($query) use ($keyword): void {
                $query
                    ->where('title', 'like', "%{$keyword}%")
                    ->orWhere('code_rule', 'like', "%{$keyword}%")
                    ->orWhereHas('user', function ($query) use ($keyword): void {
                        $query
                            ->where('name', 'like', "%{$keyword}%")
                            ->orWhere('email', 'like', "%{$keyword}%");
                    });
            });
        }

        if (isset($filters['entity_type'])) {
            $query->where('entity_type', $filters['entity_type']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'desc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

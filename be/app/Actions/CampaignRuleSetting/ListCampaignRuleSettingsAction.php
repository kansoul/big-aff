<?php

namespace App\Actions\CampaignRuleSetting;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListCampaignRuleSettingsAction
{
    /**
     * Columns allowed for `order_by`.
     *
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'name',
        'email',
        'created_at',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = User::query()
            ->with(['campaignRuleSetting']);

        // Admin → no restriction; others → transitive subtree + manager team members.
        if (! $ownership->isAdmin()) {
            $query->whereIn('id', $ownership->allowedUserIds());
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'name',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

<?php

namespace App\Actions\CampaignRuleSetting;

use App\Models\User;
use App\Support\OwnerResource\UserOwnerResource;
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
        $resource = new UserOwnerResource;

        $query = User::query()
            ->with(['campaignRuleSetting']);

        // Admin → no restriction; others → transitive subtree + manager team members.
        if (! $resource->isAdmin()) {
            $query->whereIn('id', $resource->allowedUserIds());
        }

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'id',
            defaultDirection: 'asc',
        )->applyTo($query);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

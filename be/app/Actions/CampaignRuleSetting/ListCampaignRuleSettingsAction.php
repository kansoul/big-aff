<?php

namespace App\Actions\CampaignRuleSetting;

use App\Models\User;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

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
        /** @var User $user */
        $user = Auth::user();

        $query = User::query()
            ->with(['campaignRuleSetting']);

        if (! $user->managesAllUsers()) {
            $query->whereIn('id', $user->manageableUserIds());
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

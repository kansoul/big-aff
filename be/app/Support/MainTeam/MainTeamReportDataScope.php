<?php

namespace App\Support\MainTeam;

use Illuminate\Database\Eloquent\Builder;

final class MainTeamReportDataScope
{
    public static function excludeNonFetchableAccounts(
        Builder $query,
        string $accountColumn = 'account_id',
        ?string $adsType = null,
        ?string $adsTypeColumn = null,
    ): void {
        if ($adsTypeColumn === null) {
            $query->whereNotIn($accountColumn, function ($subquery) use ($adsType): void {
                $subquery->select('accounts.account_id')
                    ->from('accounts')
                    ->join('main_teams', 'main_teams.id', '=', 'accounts.main_team_id')
                    ->whereNotNull('accounts.account_id')
                    ->when($adsType !== null, fn ($accountQuery) => $accountQuery->where('accounts.ads_type', $adsType))
                    ->where('main_teams.sync_campaign_reports', false);
            });

            return;
        }

        $query->whereNotExists(function ($subquery) use ($accountColumn, $adsType, $adsTypeColumn): void {
            $subquery->selectRaw('1')
                ->from('accounts')
                ->join('main_teams', 'main_teams.id', '=', 'accounts.main_team_id')
                ->whereColumn('accounts.account_id', $accountColumn)
                ->when($adsType !== null, fn ($accountQuery) => $accountQuery->where('accounts.ads_type', $adsType))
                ->when($adsTypeColumn !== null, fn ($accountQuery) => $accountQuery->whereColumn('accounts.ads_type', $adsTypeColumn))
                ->where('main_teams.sync_campaign_reports', false);
        });
    }
}

<?php

namespace App\Support\MainTeam;

use Illuminate\Database\Eloquent\Builder;

final class MainTeamReportDataScope
{
    public static function excludeNonFetchableAccounts(
        Builder $query,
        string $accountColumn = 'account_id',
        ?string $adsType = null,
    ): void {
        $query->whereNotIn($accountColumn, function ($subquery) use ($adsType): void {
            $subquery->select('accounts.account_id')
                ->from('accounts')
                ->join('main_teams', 'main_teams.id', '=', 'accounts.main_team_id')
                ->whereNotNull('accounts.account_id')
                ->when($adsType !== null, fn ($accountQuery) => $accountQuery->where('accounts.ads_type', $adsType))
                ->where('main_teams.sync_campaign_reports', false);
        });
    }

    public static function excludeNonFetchableChannels(Builder $query, string $channelColumn = 'channel_code'): void
    {
        $query->whereNotIn($channelColumn, function ($subquery) {
            $subquery->select('channels.code')
                ->from('channels')
                ->join('main_teams', 'main_teams.id', '=', 'channels.main_team_id')
                ->whereNotNull('channels.code')
                ->where('main_teams.sync_campaign_reports', false);
        });
    }
}

<?php

namespace App\Support\MainTeam;

use Illuminate\Database\Eloquent\Builder;

final class MainTeamReportDataScope
{
    public static function excludeNonFetchableAccounts(Builder $query): void
    {
        $query->whereNotIn('account_id', function ($subquery) {
            $subquery->select('accounts.account_id')
                ->from('accounts')
                ->join('main_teams', 'main_teams.id', '=', 'accounts.main_team_id')
                ->where('main_teams.sync_campaign_reports', false);
        });
    }

    public static function excludeNonFetchableChannels(Builder $query): void
    {
        $query->whereNotIn('channel_code', function ($subquery) {
            $subquery->select('channels.code')
                ->from('channels')
                ->join('main_teams', 'main_teams.id', '=', 'channels.main_team_id')
                ->where('main_teams.sync_campaign_reports', false);
        });
    }
}

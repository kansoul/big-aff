<?php

namespace App\Actions\MainTeam;

use App\Models\Account;
use App\Models\Channel;
use App\Models\MainTeam;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\DB;

class DeleteMainTeamAction
{
    public function execute(MainTeam $mainTeam): void
    {
        OwnershipFilter::forAuthUser()->authorize(null);

        DB::transaction(function () use ($mainTeam): void {
            Account::query()
                ->where('main_team_id', $mainTeam->id)
                ->update(['main_team_id' => null]);

            Channel::query()
                ->where('main_team_id', $mainTeam->id)
                ->update(['main_team_id' => null]);

            $mainTeam->delete();
        });
    }
}

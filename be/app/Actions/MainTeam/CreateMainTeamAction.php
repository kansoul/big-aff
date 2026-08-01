<?php

namespace App\Actions\MainTeam;

use App\Models\Account;
use App\Models\MainTeam;
use Illuminate\Support\Facades\DB;

class CreateMainTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): MainTeam
    {
        return DB::transaction(function () use ($data): MainTeam {
            $accountIds = $data['account_ids'] ?? null;
            unset($data['account_ids']);

            $mainTeam = MainTeam::query()->create($data);

            if (is_array($accountIds)) {
                Account::query()
                    ->whereIn('account_id', $accountIds)
                    ->update(['main_team_id' => $mainTeam->id]);
            }

            return $mainTeam->load('accounts')->loadCount('accounts');
        });
    }
}

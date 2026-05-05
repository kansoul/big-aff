<?php

namespace App\Actions\MainTeam;

use App\Models\Account;
use App\Models\Channel;
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
            $channelCodes = $data['channel_codes'] ?? null;
            unset($data['account_ids'], $data['channel_codes']);

            $mainTeam = MainTeam::query()->create($data);

            if (is_array($accountIds)) {
                Account::query()
                    ->whereIn('account_id', $accountIds)
                    ->update(['main_team_id' => $mainTeam->id]);
            }

            if (is_array($channelCodes)) {
                Channel::query()
                    ->whereIn('code', $channelCodes)
                    ->update(['main_team_id' => $mainTeam->id]);
            }

            return $mainTeam->load(['accounts', 'channels'])->loadCount(['accounts', 'channels']);
        });
    }
}

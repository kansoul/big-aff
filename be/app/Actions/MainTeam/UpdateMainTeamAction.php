<?php

namespace App\Actions\MainTeam;

use App\Models\Account;
use App\Models\Channel;
use App\Models\MainTeam;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\DB;

class UpdateMainTeamAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(MainTeam $mainTeam, array $data): MainTeam
    {
        OwnershipFilter::forAuthUser()->authorize(null);

        return DB::transaction(function () use ($mainTeam, $data): MainTeam {
            $accountIds = $data['account_ids'] ?? null;
            $channelCodes = $data['channel_codes'] ?? null;
            unset($data['account_ids'], $data['channel_codes']);

            if ($data !== []) {
                $mainTeam->update($data);
            }

            if (is_array($accountIds)) {
                Account::query()
                    ->where('main_team_id', $mainTeam->id)
                    ->update(['main_team_id' => null]);

                if ($accountIds !== []) {
                    Account::query()
                        ->whereIn('account_id', $accountIds)
                        ->update(['main_team_id' => $mainTeam->id]);
                }
            }

            if (is_array($channelCodes)) {
                Channel::query()
                    ->where('main_team_id', $mainTeam->id)
                    ->update(['main_team_id' => null]);

                if ($channelCodes !== []) {
                    Channel::query()
                        ->whereIn('code', $channelCodes)
                        ->update(['main_team_id' => $mainTeam->id]);
                }
            }

            return $mainTeam->fresh(['accounts', 'channels'])->loadCount(['accounts', 'channels']);
        });
    }
}

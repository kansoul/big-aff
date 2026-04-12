<?php

namespace App\Actions\CampaignRuleSetting;

use App\Models\User;
use App\Models\UserCampaignRuleSetting;

class SaveCampaignRuleSettingAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): UserCampaignRuleSetting
    {
        $setting = UserCampaignRuleSetting::updateOrCreate(
            ['user_id' => $user->id],
            $data,
        );

        $setting->load([]);

        return $setting;
    }
}

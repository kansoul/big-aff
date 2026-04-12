<?php

namespace App\Actions\CampaignRuleSetting;

use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class SaveCampaignRuleSettingAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $data): UserCampaignRuleSetting
    {
        /** @var User $auth */
        $auth = Auth::user();

        if (! $auth->canManageUser($user)) {
            throw new AuthorizationException;
        }

        $setting = UserCampaignRuleSetting::updateOrCreate(
            ['user_id' => $user->id],
            $data,
        );

        $setting->load([]);

        return $setting;
    }
}

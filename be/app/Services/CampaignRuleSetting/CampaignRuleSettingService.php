<?php

namespace App\Services\CampaignRuleSetting;

use App\Actions\CampaignRuleSetting\ListCampaignRuleSettingsAction;
use App\Actions\CampaignRuleSetting\SaveCampaignRuleSettingAction;
use App\Models\User;
use App\Models\UserCampaignRuleSetting;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CampaignRuleSettingService
{
    public function __construct(
        private readonly ListCampaignRuleSettingsAction $listAction,
        private readonly SaveCampaignRuleSettingAction $saveAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function save(User $user, array $data): UserCampaignRuleSetting
    {
        return $this->saveAction->execute($user, $data);
    }
}

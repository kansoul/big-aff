<?php

namespace App\Services\CampaignRule;

use App\Actions\CampaignRule\AutoMatchCampaignRulesAction;
use App\Actions\CampaignRule\CreateCampaignRuleAction;
use App\Actions\CampaignRule\DeleteCampaignRuleAction;
use App\Actions\CampaignRule\ListCampaignRulesAction;
use App\Actions\CampaignRule\UpdateCampaignRuleAction;
use App\Models\Campaign;
use App\Models\CampaignRule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CampaignRuleService
{
    public function __construct(
        private readonly ListCampaignRulesAction $listAction,
        private readonly CreateCampaignRuleAction $createAction,
        private readonly UpdateCampaignRuleAction $updateAction,
        private readonly DeleteCampaignRuleAction $deleteAction,
        private readonly AutoMatchCampaignRulesAction $autoMatchAction,
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
    public function create(array $data): CampaignRule
    {
        return $this->createAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(CampaignRule $rule, array $data): CampaignRule
    {
        return $this->updateAction->execute($rule, $data);
    }

    public function delete(CampaignRule $rule): void
    {
        $this->deleteAction->execute($rule);
    }

    /**
     * @param  iterable<Campaign>  $campaigns
     */
    public function autoMatch(iterable $campaigns): void
    {
        $this->autoMatchAction->execute($campaigns);
    }
}

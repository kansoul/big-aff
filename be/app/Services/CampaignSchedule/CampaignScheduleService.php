<?php

namespace App\Services\CampaignSchedule;

use App\Actions\CampaignSchedule\CreateCampaignScheduleAction;
use App\Actions\CampaignSchedule\DeleteCampaignScheduleAction;
use App\Actions\CampaignSchedule\ListCampaignSchedulesAction;
use App\Actions\CampaignSchedule\UpdateCampaignScheduleAction;
use App\Models\CampaignSchedule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CampaignScheduleService
{
    public function __construct(
        private readonly ListCampaignSchedulesAction $listAction,
        private readonly CreateCampaignScheduleAction $createAction,
        private readonly UpdateCampaignScheduleAction $updateAction,
        private readonly DeleteCampaignScheduleAction $deleteAction,
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
    public function create(array $data): CampaignSchedule
    {
        return $this->createAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(CampaignSchedule $schedule, array $data): CampaignSchedule
    {
        return $this->updateAction->execute($schedule, $data);
    }

    public function delete(CampaignSchedule $schedule): void
    {
        $this->deleteAction->execute($schedule);
    }
}

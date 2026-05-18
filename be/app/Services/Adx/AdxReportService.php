<?php

namespace App\Services\Adx;

use App\Actions\Adx\Report\ListAdxCampaignReportsAction;
use App\Actions\Adx\Report\ListAdxConversionsAction;
use App\Actions\Adx\Report\ListAdxRealtimeReportsAction;
use App\Actions\Adx\Report\ListAdxRevenueReportsAction;
use App\Actions\Adx\Report\ListAdxSpendReportsAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdxReportService
{
    public function __construct(
        private readonly ListAdxSpendReportsAction $spendReportsAction,
        private readonly ListAdxCampaignReportsAction $campaignReportsAction,
        private readonly ListAdxRevenueReportsAction $revenueReportsAction,
        private readonly ListAdxRealtimeReportsAction $realtimeReportsAction,
        private readonly ListAdxConversionsAction $conversionsAction,
    ) {}

    public function spend(array $filters): LengthAwarePaginator
    {
        return $this->spendReportsAction->execute($filters);
    }

    public function campaigns(array $filters): LengthAwarePaginator
    {
        return $this->campaignReportsAction->execute($filters);
    }

    public function campaignFilters(array $filters = []): array
    {
        return $this->campaignReportsAction->filters($filters);
    }

    public function revenue(array $filters): LengthAwarePaginator
    {
        return $this->revenueReportsAction->execute($filters);
    }

    public function realtime(array $filters): LengthAwarePaginator
    {
        return $this->realtimeReportsAction->execute($filters);
    }

    public function conversions(array $filters): LengthAwarePaginator
    {
        return $this->conversionsAction->execute($filters);
    }
}

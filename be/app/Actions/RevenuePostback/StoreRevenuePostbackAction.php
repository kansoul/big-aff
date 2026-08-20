<?php

namespace App\Actions\RevenuePostback;

use App\Models\RevenueReport;

class StoreRevenuePostbackAction
{
    /**
     * @param  array{session_id: string, revenue: int|float|string}  $data
     */
    public function execute(array $data): RevenueReport
    {
        $report = RevenueReport::query()
            ->where('session_id', $data['session_id'])
            ->firstOrFail();

        $report->update([
            'revenue' => $data['revenue'],
            'revenue_received_at' => now(),
        ]);

        return $report->refresh();
    }
}

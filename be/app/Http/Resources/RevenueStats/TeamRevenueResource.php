<?php

namespace App\Http\Resources\RevenueStats;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamRevenueResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $revenue = (float) $this->revenue;
        $spend = (float) $this->spend;
        $profit = (float) $this->profit;
        $roi = $spend > 0 ? round(($profit / $spend) * 100, 2) : 0.0;

        return [
            'team_id' => (int) $this->team_id,
            'team_name' => $this->team_name,
            'revenue' => $revenue,
            'spend' => $spend,
            'profit' => $profit,
            'roi' => $roi,
        ];
    }
}

<?php

namespace App\Filament\Pages\Widgets;

use App\Enums\AccessEnum;
use App\Enums\RoleEnum;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Livewire\Attributes\Reactive;

class TrackingAnalyticsStatsWidget extends StatsOverviewWidget
{
    /**
     * @var array<string, mixed> | null
     */
    #[Reactive]
    public ?array $data = [];

    protected function getColumns(): int
    {
        return 2;
    }

    public static function canView(): bool
    {
        $user = auth_user();

        return $user->role === RoleEnum::ADMIN || $user->access === AccessEnum::FACEBOOK || $user->access === AccessEnum::ALL;
    }

    protected function getStats(): array
    {
        return array_map(function ($item) {
            $ctrString = isset($item['ctr']) ? 'CTR: ' . number_format($item['ctr'] ?? 0, 2) . '% | ' : '';
            $ctrLDPString = isset($item['ctr_ldp']) ? 'CTR LDP: ' . number_format($item['ctr_ldp'] ?? 0, 2) . '% | ' : '';
            return Stat::make($item['name'], $item['value'])
                ->description($ctrString . $ctrLDPString . $item['description'])
                ->descriptionIcon($item['description_icon'])
                ->color($item['color']);
        }, $this->data);
    }

    public function mount(?array $data = null): void
    {
        if (is_array($data)) {
            $this->data = $data;
        }
    }
}

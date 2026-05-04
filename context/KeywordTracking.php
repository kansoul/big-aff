<?php

namespace App\Filament\Pages\Widgets;

use App\Models\EventClick;
use Carbon\Carbon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Reactive;

class KeywordTracking extends BaseWidget
{
    protected int|string|array $columnSpan = 'full';

    protected static bool $isLazy = false;

    /**
     * @var array<string, mixed> | null
     */
    #[Reactive]
    public ?array $pageFilters = [];

    public function table(Table $table): Table
    {
        return $table
            ->query(
                $this->getQuery()
            )
            ->modifyQueryUsing(function (Builder $query) {
                return $query;
            })
            ->columns([
                TextColumn::make('keyword_clicked')
                    ->label('Keyword')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('click_count')
                    ->label('Count')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('click_ad_count')
                    ->label('Ad Clicks')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('ctr')
                    ->getStateUsing(function ($record) {
                        return $record->click_count > 0 ? number_format(($record->click_ad_count / $record->click_count) * 100, 2) . '%' : '0.00%';
                    })
                    ->label('CTR')
                    ->numeric()
                    ->sortable(
                        query: function (Builder $query, string $direction): Builder {
                            return $query->orderByRaw("
                                CASE
                                    WHEN click_count > 0 THEN click_ad_count / click_count
                                    ELSE 0
                                END {$direction}
                            ");
                        }
                    ),
            ])
            ->striped()
            ->deferLoading()
            ->recordActions([])
            ->toolbarActions([])
            ->defaultSort('click_count', 'desc')
            ->defaultKeySort(false);
    }

    public function getQuery(): Builder
    {
        $user = auth_user();
        $allowedStyles = $user->getStyleCodes();

        $query = EventClick::select([
            DB::raw('MIN(event_clicks.id) as id'),
            'event_clicks.keyword_clicked',
            DB::raw('COUNT(*) as click_count'),
            DB::raw("SUM(CASE WHEN event_clicks.type = 'click_ad' THEN 1 ELSE 0 END) AS click_ad_count"),
        ])
            ->leftJoin('link_datas', 'event_clicks.link_data_id', '=', 'link_datas.id')
            ->whereNotNull('event_clicks.keyword_clicked')
            ->when(! $user->isAdmin(), function ($query) use ($allowedStyles) {
                return $query->whereIn('link_datas.style_code', $allowedStyles);
            });

        if ($this->pageFilters) {
            $rawRange = $this->pageFilters['date_start'] ?? null;
            $startDate = null;
            $endDate = null;

            if ($rawRange && str_contains($rawRange, ' - ')) {
                [$s, $e] = explode(' - ', $rawRange);
                $startDate = $s ? Carbon::createFromFormat('d/m/Y', $s)->startOfDay() : null;
                $endDate = $e ? Carbon::createFromFormat('d/m/Y', $e)->endOfDay() : null;
            } elseif ($rawRange) {
                $d = Carbon::createFromFormat('d/m/Y', $rawRange);
                $startDate = $d?->startOfDay();
                $endDate = $d?->endOfDay();
            }

            $linkTrackingId = $this->pageFilters['link_tracking_id'] ?? null;
            $campaignId = $this->pageFilters['campaign_id'] ?? null;

            $query->when($startDate, function ($q) use ($startDate) {
                return $q->where('event_clicks.created_at', '>=', $startDate);
            })
                ->when($endDate, function ($q) use ($endDate) {
                    return $q->where('event_clicks.created_at', '<=', $endDate);
                })
                ->when($linkTrackingId, function ($q) use ($linkTrackingId) {
                    return $q->where('link_datas.link_tracking_id', $linkTrackingId);
                })
                ->when($campaignId, function ($q) use ($campaignId) {
                    return $q->where('link_datas.campaign_id', $campaignId);
                });
        }

        return $query->groupBy('event_clicks.keyword_clicked');
    }

    public function mount(?array $filters = null): void
    {
        if (is_array($filters)) {
            $this->pageFilters = $filters;
        }
    }
}

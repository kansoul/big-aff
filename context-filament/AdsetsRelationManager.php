<?php

namespace App\Filament\Resources\AllReportResource\RelationManagers;

use App\Models\AllReport;
use Illuminate\Support\Facades\DB;
use Exception;
use Filament\Actions\Action;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Malzariey\FilamentDaterangepickerFilter\Filters\DateRangeFilter;
use Carbon\Carbon;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Tables\Columns\Summarizers\Sum;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Enums\FiltersLayout;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Grouping\Group;
use Filament\Notifications\Notification;
use App\Services\AdsStatusService;

class AdsetsRelationManager extends RelationManager
{
    protected static string $relationship = 'adsets';

    protected static ?string $title = 'Adsets';

    public function table(Table $table): Table
    {
        $statusOptions = [
            'ACTIVE' => 'Active',
            'PAUSED' => 'Paused',
            'PENDING_REVIEW' => 'Pending Review',
            'DISAPPROVED' => 'Disapproved',
            'PREAPPROVED' => 'Preapproved',
            'PENDING_BILLING_INFO' => 'Pending Billing Info',
            'CAMPAIGN_PAUSED' => 'Campaign Paused',
            'ARCHIVED' => 'Archived',
            'ADSET_PAUSED' => 'Adset Paused',
            'IN_PROCESS' => 'In Process',
            'WITH_ISSUES' => 'With Issues',
        ];

        return $table
            ->recordTitleAttribute('adset_name')
            ->modifyQueryUsing(function ($query) {
                return $query->addSelect([
                    'conversion_realtime' => \App\Models\EventClick::query()
                        ->selectRaw('count(*)')
                        ->whereColumn('event_clicks.adset_id', 'adset_insights_campaigns.adset_id')
                        ->where('event_clicks.type', 'click_ad')
                        ->whereRaw('DATE(event_clicks.created_at) = adset_insights_campaigns.date_start')
                        ->whereNull('event_clicks.deleted_at'),

                    'rpc_est' => AllReport::query()
                        ->selectRaw('COALESCE(
                            (
                                SELECT MAX(NULLIF(ar2.cost_per_click, 0))
                                FROM all_reports ar2
                                WHERE ar2.style_code = all_reports.style_code
                                AND ar2.date_start = all_reports.date_start
                                AND ar2.deleted_at IS NULL
                            ),
                            (
                                SELECT SUM(ar3.estimated_earnings) / NULLIF(SUM(td_inner.click_ad_count), 0)
                                FROM all_reports ar3
                                JOIN tracking_daily td_inner ON td_inner.link_data_id = ar3.link_data_id AND td_inner.event_time = ar3.date_start
                                WHERE ar3.style_code = all_reports.style_code
                                AND ar3.date_start = all_reports.date_start
                                AND ar3.deleted_at IS NULL
                            )
                        , 0)')
                        ->whereColumn('all_reports.campaign_id', 'adset_insights_campaigns.campaign_id')
                        ->whereColumn('all_reports.date_start', 'adset_insights_campaigns.date_start')
                        ->whereNull('all_reports.deleted_at')
                        ->limit(1),
                ]);
            })
            ->columns([
                TextColumn::make('adset_id')
                    ->label('Adset ID')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('adset_name')
                    ->label('Adset Name')
                    ->searchable()
                    ->sortable()
                    ->limit(50),

                TextColumn::make('campaign_id')
                    ->label('Campaign ID')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('account_id')
                    ->label('Account ID')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('date_start')
                    ->label('Date')
                    ->dateTime('d/m/Y')
                    ->sortable(),

                TextColumn::make('ads_status')
                    ->label('Status')
                    ->badge()
                    ->getStateUsing(function ($record) {
                        return $record->status;
                    })
                    ->color(fn(string $state): string => match ($state) {
                        'ACTIVE' => 'success',
                        'PAUSED' => 'warning',
                        'DELETED' => 'danger',
                        'ARCHIVED' => 'gray',
                        default => 'gray',
                    }),

                ToggleColumn::make('status')
                    ->label('Off/On')
                    ->disabled(function ($record) {
                        return ! in_array($record->status, ['ACTIVE', 'PAUSED']);
                    })
                    ->state(function ($record) {
                        return $record->status === 'ACTIVE' ? true : false;
                    })
                    ->updateStateUsing(function ($record, $state) {
                        try {
                            $record->refresh();
                            $isActive = $record->status === 'ACTIVE';
                            $isPaused = $record->status === 'PAUSED';

                            if (! $isActive && ! $isPaused) {
                                return false;
                            }

                            $newStatus = $state ? 'ACTIVE' : 'PAUSED';

                            $statusService = app(AdsStatusService::class);
                            $success = $statusService->updateAdsetStatus($record->adset_id, $newStatus);

                            if ($success) {
                                $record->update(['status' => $newStatus]);
                                Notification::make()
                                    ->title('Adset status updated successfully')
                                    ->body("Adset {$record->adset_name} is now {$newStatus}")
                                    ->success()
                                    ->send();
                            } else {
                                Notification::make()
                                    ->title('Failed to update adset status')
                                    ->body("Could not update adset {$record->adset_name}")
                                    ->danger()
                                    ->send();
                            }

                            return $success;
                        } catch (Exception $e) {
                            Notification::make()
                                ->title('Failed to update adset status')
                                ->body("Could not update adset {$record->adset_name}")
                                ->danger()
                                ->send();

                            return false;
                        }
                    })
                    ->tooltip(function ($record) {
                        $isActive = $record->status === 'ACTIVE';
                        $isPaused = $record->status === 'PAUSED';
                        if (! $isActive && ! $isPaused) {
                            return 'Cannot toggle this adset status';
                        }

                        return $isActive ? 'Click to pause adset' : 'Click to activate adset';
                    }),

                TextColumn::make('daily_budget')
                    ->label('Daily Budget')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('revenue_est')
                    ->label('Revenue Est')
                    ->sortable(false)
                    ->getStateUsing(function ($record) {
                        return (float) ($record->rpc_est ?? 0) * (float) ($record->conversion_realtime ?? 0);
                    })
                    ->formatStateUsing(fn($state) => $state != 0 ? '$' . number_format($state, 2) : '-'),

                TextColumn::make('spend')
                    ->label('Spend')
                    ->money('USD')
                    ->summarize(
                        Sum::make('spend')
                            ->label('Total Spend')
                            ->money('USD')
                    )
                    ->sortable(),

                TextColumn::make('profit_realtime')
                    ->label('🟢 Profit Realtime')
                    ->money('USD')
                    ->sortable(false)
                    ->getStateUsing(function ($record) {
                        $spend = (float) ($record->spend ?? 0);
                        if ($spend == 0) return null;
                        $revenueEst = (float) ($record->rpc_est ?? 0) * (float) ($record->conversion_realtime ?? 0);
                        return $revenueEst - $spend;
                    })
                    ->color(fn($state) => match (true) {
                        $state === null => 'gray',
                        $state > 0     => 'success',
                        $state < 0     => 'danger',
                        default        => 'gray',
                    })
                    ->placeholder('-')
                    ->tooltip('Realtime Profit = Revenue RT - Spend'),

                TextColumn::make('roi_realtime')
                    ->label('🟢 ROI Realtime (%)')
                    ->suffix('%')
                    ->numeric(decimalPlaces: 2)
                    ->sortable(false)
                    ->getStateUsing(function ($record) {
                        $spend = (float) ($record->spend ?? 0);
                        if ($spend == 0) return null;

                        $revenueEst = (float) ($record->rpc_est ?? 0) * (float) ($record->conversion_realtime ?? 0);
                        $profit = $revenueEst - $spend;

                        return ($profit / $spend) * 100;
                    })
                    ->color(fn($state) => match (true) {
                        $state === null => 'gray',
                        $state > 0     => 'success',
                        $state < 0     => 'danger',
                        default        => 'gray',
                    })
                    ->placeholder('-')
                    ->tooltip('Realtime ROI = (Profit RT / Spend) × 100%'),

                TextColumn::make('fb_clicks')
                    ->label('🔵 ADS Conv.')
                    ->sortable(),

                TextColumn::make('conversion_realtime')
                    ->label('🟢 Realtime Conv.')
                    ->numeric()
                    ->sortable(false)
                    ->tooltip('Realtime conversion from event clicks'),

                TextColumn::make('rpc_est')
                    ->label('🟡 RPC')
                    ->money('USD')
                    ->sortable(false)
                    ->getStateUsing(function ($record) {
                        return (float) ($record->rpc_est ?? 0);
                    })
                    ->formatStateUsing(fn($state) => $state != 0 ? '$' . number_format($state, 2) : '-'),

                TextColumn::make('cpa')
                    ->label('🔵 CPA')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('cpa_realtime')
                    ->label('🟢 Realtime CPA')
                    ->money('USD')
                    ->getStateUsing(function ($record) {
                        $conversionRealtime = $record->conversion_realtime;

                        if ($conversionRealtime == 0) {
                            return null;
                        }

                        $spend = (float) ($record->spend ?? 0);

                        return $spend / $conversionRealtime;
                    })
                    ->sortable(false)
                    ->placeholder('-')
                    ->tooltip('Realtime CPA (Spend / Conversion RT)'),

                TextColumn::make('impressions')
                    ->label('Impressions')
                    ->sortable(),

                TextColumn::make('clicks')
                    ->label('Clicks')
                    ->sortable(),

                TextColumn::make('reach')
                    ->label('Reach')
                    ->sortable(),

                TextColumn::make('cpc')
                    ->label('CPC')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('cpm')
                    ->label('CPM')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('ctr')
                    ->label('CTR')
                    ->numeric(decimalPlaces: 2)
                    ->sortable(),

                TextColumn::make('link_clicks')
                    ->label('Link Clicks')
                    ->sortable(),

                TextColumn::make('article_views')
                    ->label('Article Views')
                    ->sortable(),

                TextColumn::make('search_views')
                    ->label('Search Views')
                    ->sortable(),

                TextColumn::make('inline_link_click_ctr')
                    ->label('Inline Link Click CTR')
                    ->numeric(decimalPlaces: 2)
                    ->sortable(),

                TextColumn::make('cost_per_inline_link_click')
                    ->label('Cost Per Inline Link Click')
                    ->money('USD')
                    ->sortable(),

                TextColumn::make('frequency')
                    ->label('Frequency')
                    ->numeric(decimalPlaces: 2)
                    ->sortable(),

                TextColumn::make('created_time')
                    ->label('Created Time')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),

                TextColumn::make('updated_time')
                    ->label('Updated Time')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options($statusOptions),

                Filter::make('adset_id')
                    ->schema([
                        TextInput::make('adset_id')
                            ->label('Adset ID')
                            ->placeholder('Enter Adset ID'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['adset_id'],
                                fn(Builder $query, $adsetId): Builder => $query->where('adset_id', 'like', "%{$adsetId}%"),
                            );
                    }),

                Filter::make('adset_name')
                    ->schema([
                        TextInput::make('adset_name')
                            ->label('Adset Name')
                            ->placeholder('Enter Adset Name'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['adset_name'],
                                fn(Builder $query, $adsetName): Builder => $query->where('adset_name', 'like', "%{$adsetName}%"),
                            );
                    }),

                DateRangeFilter::make('date_start')
                    ->label('Date')
                    ->query(function (Builder $query, array $data): Builder {
                        $startDate = explode(' - ', $data['date_start'])[0] ?? null;
                        $endDate = explode(' - ', $data['date_start'])[1] ?? null;
                        $startDate = $startDate ? Carbon::createFromFormat('d/m/Y', $startDate)->toDateString() : Carbon::now()->format('Y-m-d');
                        $endDate = $endDate ? Carbon::createFromFormat('d/m/Y', $endDate)->toDateString() : Carbon::now()->format('Y-m-d');
                        if ($startDate) {
                            $query = $query->whereDate('date_start', '>=', $startDate);
                        }

                        if ($endDate) {
                            $query = $query->whereDate('date_start', '<=', $endDate);
                        }

                        return $query;
                    }),

                DateRangeFilter::make('created_time')
                    ->label('Created Time')
                    ->query(function (Builder $query, array $data): Builder {
                        $startDate = explode(' - ', $data['created_time'])[0] ?? null;
                        $endDate = explode(' - ', $data['created_time'])[1] ?? null;
                        $startDate = $startDate ? Carbon::createFromFormat('d/m/Y', $startDate)->toDateString() : null;
                        $endDate = $endDate ? Carbon::createFromFormat('d/m/Y', $endDate)->toDateString() : null;

                        if ($startDate) {
                            $query = $query->whereDate('created_time', '>=', $startDate);
                        }

                        if ($endDate) {
                            $query = $query->whereDate('created_time', '<=', $endDate);
                        }

                        return $query;
                    }),
            ])
            ->groups([
                Group::make('date_start')
                    ->label('Date'),
            ])
            ->deferFilters()
            ->defaultSort('created_time', 'desc')
            ->striped()
            ->paginated([10, 25, 50, 100])
            ->filtersLayout(FiltersLayout::AboveContent)
            ->filtersTriggerAction(
                fn(Action $action) => $action
                    ->button()
                    ->label('Filter'),
            );
    }
}

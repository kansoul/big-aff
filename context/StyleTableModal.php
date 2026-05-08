<?php

namespace App\Livewire;

use App\Models\AdsenseChartReport;
use Carbon\Carbon;
use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Components\Select;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Schemas\Components\Grid;
use Filament\Tables\Columns\Summarizers\Summarizer;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Enums\FiltersLayout;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Grouping\Group;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Component;
use Malzariey\FilamentDaterangepickerFilter\Fields\DateRangePicker;

class StyleTableModal extends Component implements HasForms, HasTable, HasActions
{
    use InteractsWithActions;
    use InteractsWithForms;
    use InteractsWithTable;

    public string $styleCode = '';

    public ?string $initialDate = null;

    public function table(Table $table): Table
    {
        $styleCode = $this->styleCode;
        $initialDate = $this->initialDate;
        $defaultDateRange = $initialDate
            ? $initialDate . ' - ' . $initialDate
            : Carbon::now()->format('d/m/Y') . ' - ' . Carbon::now()->format('d/m/Y');

        return $table
            ->query(AdsenseChartReport::query())
            ->columns([
                TextColumn::make('custom_search_style_name')
                    ->label('Style')
                    ->searchable(),
                TextColumn::make('datetime')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                TextColumn::make('cost_per_click')
                    ->label('🟡 RPC')
                    ->money('USD')
                    ->state(function ($record) {
                        return $record->real_clicks > 0 ? $record->real_earnings / $record->real_clicks : 0;
                    })
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 RPC')
                            ->using(function ($query) {
                                $records = $query->get();
                                $clicks = $records->sum('real_clicks');
                                $earnings = $records->sum('real_earnings');
                                return $clicks > 0 ? $earnings / $clicks : 0;
                            })
                            ->money('USD')
                    ),
                TextColumn::make('real_earnings')
                    ->label('🟡 Revenue')
                    ->money('USD')
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 Revenue')
                            ->using(fn($query) => $query->get()->sum('real_earnings'))
                            ->money('USD')
                    ),
                TextColumn::make('real_clicks')
                    ->label('🟡 Conv.')
                    ->numeric()
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 Conv.')
                            ->using(fn($query) => $query->get()->sum('real_clicks'))
                    ),
                TextColumn::make('real_page_views')
                    ->label('🟡 SearchView')
                    ->numeric()
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 SearchView')
                            ->using(fn($query) => $query->get()->sum('real_page_views'))
                    ),
                TextColumn::make('real_ad_requests')
                    ->label('🟡 Ad Requests')
                    ->numeric()
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 Ad Requests')
                            ->using(fn($query) => $query->get()->sum('real_ad_requests'))
                    ),
                TextColumn::make('real_impressions')
                    ->label('🟡 Search Impressions')
                    ->numeric(),
                TextColumn::make('ad_requests_rpm')
                    ->label('🟡 Search RPM')
                    ->numeric()
                    ->state(function ($record) {
                        return $record->real_ad_requests > 0 ? ($record->real_earnings / $record->real_ad_requests) * 1000 : 0;
                    }),
                TextColumn::make('impressions_rpm')
                    ->label('🟡 Impressions RPM')
                    ->numeric()
                    ->state(function ($record) {
                        return $record->real_impressions > 0 ? ($record->real_earnings / $record->real_impressions) * 1000 : 0;
                    }),
                TextColumn::make('real_funnel_requests')
                    ->label('🟡 Keyword Request')
                    ->numeric()
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 Keyword Request')
                            ->using(fn($query) => $query->get()->sum('real_funnel_requests'))
                    ),
                TextColumn::make('real_funnel_impressions')
                    ->label('🟡 Keyword Impressions')
                    ->numeric(),
                TextColumn::make('real_funnel_clicks')
                    ->label('🟡 Click keyword')
                    ->numeric()
                    ->summarize(
                        Summarizer::make()
                            ->label('🟡 Click keyword')
                            ->using(fn($query) => $query->get()->sum('real_funnel_clicks'))
                    ),
                TextColumn::make('funnel_rpm')
                    ->label('🟡 Keyword RPM')
                    ->numeric()
                    ->state(function ($record) {
                        return $record->real_funnel_requests > 0 ? ($record->real_earnings / $record->real_funnel_requests) * 1000 : 0;
                    }),
            ])
            ->defaultGroup('custom_search_style_name')
            ->groups([
                Group::make('custom_search_style_name')
                    ->label('Style Name'),
            ])
            ->groupingSettingsHidden()
            ->filters([
                Filter::make('report_filters')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                DateRangePicker::make('datetime')
                                    ->label('Date Range')
                                    ->default($defaultDateRange),

                                Select::make('hourly_interval')
                                    ->label('Interval')
                                    ->default(1)
                                    ->options([
                                        '5m'  => '5 Minutes',
                                        '15m' => '15 Minutes',
                                        '30m' => '30 Minutes',
                                        1     => '1 Hour',
                                        2     => '2 Hours',
                                        3     => '3 Hours',
                                        4     => '4 Hours',
                                        6     => '6 Hours',
                                        12    => '12 Hours',
                                        24    => 'Daily',
                                    ]),
                            ]),
                    ])
                    ->query(function (Builder $query, array $data) use ($styleCode) {
                        $dateRange = $data['datetime'] ?? null;
                        if ($dateRange) {
                            $startDate = explode(' - ', $dateRange)[0] ?? null;
                            $endDate = explode(' - ', $dateRange)[1] ?? null;
                            $startDate = $startDate ? Carbon::createFromFormat('d/m/Y', $startDate)->startOfDay() : Carbon::now()->startOfDay();
                            $endDate = $endDate ? Carbon::createFromFormat('d/m/Y', $endDate)->endOfDay() : Carbon::now()->endOfDay();
                            $query->whereBetween('datetime', [$startDate, $endDate]);
                        } else {
                            $query->whereDate('datetime', Carbon::yesterday());
                        }

                        $interval = $data['hourly_interval'] ?? 1;

                        if ($interval === '5m') {
                            $query->whereRaw('MINUTE(datetime) % 5 = 0');
                        } elseif ($interval === '15m') {
                            $query->whereRaw('MINUTE(datetime) % 15 = 0');
                        } elseif ($interval === '30m') {
                            $query->whereRaw('MINUTE(datetime) % 30 = 0');
                        } elseif ($interval) {
                            $query->whereRaw('MINUTE(datetime) = 0');
                            if ($interval > 1) {
                                $query->whereRaw('HOUR(datetime) % ? = 0', [$interval]);
                            }
                        }

                        if ($styleCode) {
                            $query->where('custom_search_style_id', $styleCode);
                        } else {
                            $query->whereRaw('1 = 0');
                        }
                    })
                    ->columnSpanFull(),
            ])
            ->paginated([10, 25, 50, 100, 200, 'all'])
            ->filtersLayout(FiltersLayout::AboveContent)
            ->defaultSort('datetime', 'desc')
            ->modifyQueryUsing(function (Builder $query) {
                $query->addSelect([
                    '*',
                    \Illuminate\Support\Facades\DB::raw('estimated_earnings - COALESCE(LAG(estimated_earnings) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_earnings'),
                    \Illuminate\Support\Facades\DB::raw('clicks - COALESCE(LAG(clicks) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_clicks'),
                    \Illuminate\Support\Facades\DB::raw('page_views - COALESCE(LAG(page_views) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_page_views'),
                    \Illuminate\Support\Facades\DB::raw('ad_requests - COALESCE(LAG(ad_requests) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_ad_requests'),
                    \Illuminate\Support\Facades\DB::raw('impressions - COALESCE(LAG(impressions) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_impressions'),
                    \Illuminate\Support\Facades\DB::raw('funnel_requests - COALESCE(LAG(funnel_requests) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_funnel_requests'),
                    \Illuminate\Support\Facades\DB::raw('funnel_impressions - COALESCE(LAG(funnel_impressions) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_funnel_impressions'),
                    \Illuminate\Support\Facades\DB::raw('funnel_clicks - COALESCE(LAG(funnel_clicks) OVER (PARTITION BY custom_search_style_id, DATE(datetime) ORDER BY datetime), 0) as real_funnel_clicks'),
                ]);
            });
    }

    public function render()
    {
        return view('livewire.style-table-modal');
    }
}

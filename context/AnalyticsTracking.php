<?php

namespace App\Filament\Pages;

use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Actions;
use Filament\Actions\Action;
use App\Enums\AccessEnum;
use App\Enums\RoleEnum;
use App\Filament\Pages\Widgets\KeywordTracking;
use App\Filament\Pages\Widgets\TrackingAnalyticsStatsWidget;
use App\Models\LinkData;
use App\Models\LinkTracking;
use Carbon\Carbon;
use Filament\Forms\Components\Select;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Pages\Page;
use Malzariey\FilamentDaterangepickerFilter\Fields\DateRangePicker;
use Illuminate\Support\Facades\DB;

class AnalyticsTracking extends Page implements HasForms
{
    use InteractsWithForms;

    public ?array $filters = [];
    public ?array $filtersDraft = [];

    public function mount(): void
    {
        if (request()->has('filters')) {
            $filters = request()->query('filters', []);
            $this->filters = $filters;
            $this->filtersDraft = $filters;
            $this->form->fill($this->filtersDraft);
        } else {
            $this->form->fill();
            $this->filtersDraft = $this->form->getState();
            $this->filters      = $this->filtersDraft;
        }
    }

    protected $queryString = [
        'filters' => ['except' => ''],
    ];

    protected static string | \BackedEnum | null $navigationIcon  = 'heroicon-o-chart-bar';
    protected static string | \UnitEnum | null $navigationGroup = 'Tracking';
    protected static ?string $navigationLabel = 'Analytics Tracking';
    protected static ?string $title = 'Tracking Analytics';
    protected static ?string $slug = 'analytics-tracking';
    protected string $view = 'filament.pages.analytics-tracking';


    public static function canAccess(): bool
    {
        $user = auth_user();

        return ($user->role === RoleEnum::ADMIN || $user->access === AccessEnum::FACEBOOK || $user->access === AccessEnum::ALL) && ! $user->isRestricted();
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Filters')
                    ->schema([
                        DateRangePicker::make('date_start')
                            ->startDate(Carbon::now())
                            ->endDate(Carbon::now()),
                        Select::make('link_tracking_id')
                            ->label('Link Tracking')
                            ->optionsLimit(1000)
                            ->options(function () {
                                $user = auth_user();
                                $allowedStyles = $user->getStyleCodes();

                                return LinkTracking::distinct()
                                    ->join('link_datas', 'link_trackings.id', '=', 'link_datas.link_tracking_id')
                                    ->whereNotNull('link')
                                    ->when(!$user->isAdmin(), function ($query) use ($allowedStyles) {
                                        return $query->whereIn('link_datas.style_code', $allowedStyles);
                                    })
                                    ->pluck('link', 'link_trackings.id')
                                    ->toArray();
                            })
                            ->searchable()
                            ->columnSpan(2),
                        Select::make('campaign_id')
                            ->label('Campaign ID')
                            ->optionsLimit(1000)
                            ->options(function () {
                                $user = auth_user();
                                $allowedStyles = $user->getStyleCodes();

                                return LinkData::distinct()
                                    ->whereNotNull('link_datas.campaign_id')
                                    ->when(!$user->isAdmin(), function ($query) use ($allowedStyles) {
                                        return $query->whereIn('link_datas.style_code', $allowedStyles);
                                    })
                                    ->pluck('link_datas.campaign_id', 'link_datas.campaign_id')
                                    ->toArray();
                            })
                            ->searchable(),
                        Actions::make([
                            Action::make('apply')
                                ->label('Apply filters')
                                ->action('applyFilters')
                                ->color('primary'),
                        ])
                    ])
                    ->columns(4),

            ])
            ->statePath('filtersDraft');
    }

    public function applyFilters(): void
    {
        $this->filtersDraft = $this->form->getState();
        $this->filters = $this->filtersDraft;
    }

    protected function getFooterWidgets(): array
    {
        $filters = $this->filtersDraft;
        $rawRange = $filters['date_start'] ?? null;
        $startDate = null;
        $endDate   = null;
        if ($rawRange && str_contains($rawRange, ' - ')) {
            [$s, $e] = explode(' - ', $rawRange);
            $startDate = $s ? Carbon::createFromFormat('d/m/Y', $s)->startOfDay() : null;
            $endDate   = $e ? Carbon::createFromFormat('d/m/Y', $e)->endOfDay()   : null;
        } elseif ($rawRange) {
            $d = Carbon::createFromFormat('d/m/Y', $rawRange);
            $startDate = $d?->startOfDay();
            $endDate   = $d?->endOfDay();
        }

        $linkTrackingId = $filters['link_tracking_id'] ?? null;
        $campaignId     = $filters['campaign_id'] ?? null;

        $user          = auth_user();
        $allowedStyles = $user->getStyleCodes();

        $views  = DB::table('event_views as e')->selectRaw("
                SUM(CASE WHEN type = 'view_search'  THEN 1 ELSE 0 END) AS search_views,
                SUM(CASE WHEN type = 'view_article' THEN 1 ELSE 0 END) AS article_views
            ")
            ->whereIn('e.type', ['view_search', 'view_article'])
            ->when($startDate, function ($query) use ($startDate) {
                return $query->where('e.created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                return $query->where('e.created_at', '<=', $endDate);
            })
            ->when($linkTrackingId || $campaignId || !$user->isAdmin(), function ($query) {
                return $query->join('link_datas as ld', 'e.link_data_id', '=', 'ld.id');
            })
            ->when($linkTrackingId, function ($query) use ($linkTrackingId) {
                return $query->where('ld.link_tracking_id', $linkTrackingId);
            })
            ->when($campaignId, function ($query) use ($campaignId) {
                return $query->where('ld.campaign_id', $campaignId);
            })
            ->when(!$user->isAdmin(), function ($query) use ($allowedStyles) {
                return $query->whereIn('ld.style_code', $allowedStyles);
            })
            ->first();

        $clicks = DB::table('event_clicks as e')->selectRaw("
                SUM(CASE WHEN type = 'click_ad'      THEN 1 ELSE 0 END) AS search_ad_clicks,
                SUM(CASE WHEN type = 'click_keyword' THEN 1 ELSE 0 END) AS article_related_clicks
            ")
            ->whereIn('e.type', ['click_ad', 'click_keyword'])
            ->when($startDate, function ($query) use ($startDate) {
                return $query->where('e.created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                return $query->where('e.created_at', '<=', $endDate);
            })
            ->when($linkTrackingId || $campaignId || !$user->isAdmin(), function ($query) {
                return $query->join('link_datas as ld', 'e.link_data_id', '=', 'ld.id');
            })
            ->when($linkTrackingId, function ($query) use ($linkTrackingId) {
                return $query->where('ld.link_tracking_id', $linkTrackingId);
            })
            ->when($campaignId, function ($query) use ($campaignId) {
                return $query->where('ld.campaign_id', $campaignId);
            })
            ->when(!$user->isAdmin(), function ($query) use ($allowedStyles) {
                return $query->whereIn('ld.style_code', $allowedStyles);
            })
            ->first();

        $loads  = DB::table('event_ad_loads as e')->selectRaw("
                SUM(CASE WHEN type = 'ads_load_search_error'    THEN 1 ELSE 0 END) AS failed_search_ad_loads,
                SUM(CASE WHEN type = 'ads_load_article_error'   THEN 1 ELSE 0 END) AS failed_article_ad_loads
            ")
            ->whereIn('e.type', ['ads_load_search_error', 'ads_load_article_error'])
            ->when($startDate, function ($query) use ($startDate) {
                return $query->where('e.created_at', '>=', $startDate);
            })
            ->when($endDate, function ($query) use ($endDate) {
                return $query->where('e.created_at', '<=', $endDate);
            })
            ->when($linkTrackingId || $campaignId || !$user->isAdmin(), function ($query) {
                return $query->join('link_datas as ld', 'e.link_data_id', '=', 'ld.id');
            })
            ->when($linkTrackingId, function ($query) use ($linkTrackingId) {
                return $query->where('ld.link_tracking_id', $linkTrackingId);
            })
            ->when($campaignId, function ($query) use ($campaignId) {
                return $query->where('ld.campaign_id', $campaignId);
            })
            ->when(!$user->isAdmin(), function ($query) use ($allowedStyles) {
                return $query->whereIn('ld.style_code', $allowedStyles);
            })
            ->first();

        $viewsData = [
            [
                'name' => 'Search Views',
                'value' => $views->search_views ?? 0,
                'ctr' => $views->article_views ? ($views->search_views / $views->article_views) * 100 : 0,
                'description' => 'Total search page views',
                'description_icon' => 'heroicon-m-eye',
                'color' => 'primary',
            ],
            [
                'name' => 'Article Views',
                'value' => $views->article_views ?? 0,
                'description' => 'Total article page views',
                'description_icon' => 'heroicon-m-document-text',
                'color' => 'success',
            ],
        ];

        $clicksData = [
            [
                'name' => 'Search Ad Clicks',
                'ctr' => $views->search_views ? ($clicks->search_ad_clicks / $views->search_views) * 100 : 0,
                'ctr_ldp' => $views->article_views ? ($clicks->search_ad_clicks / $views->article_views) * 100 : 0,
                'value' => $clicks->search_ad_clicks ?? 0,
                'description' => 'Total search ad clicks',
                'description_icon' => 'heroicon-m-cursor-arrow-rays',
                'color' => 'warning',
            ],
            [
                'name' => 'Article Ad Clicks',
                'ctr' => $views->article_views ? ($clicks->article_related_clicks / $views->article_views) * 100 : 0,
                'value' => $clicks->article_related_clicks ?? 0,
                'description' => 'Total article ad clicks',
                'description_icon' => 'heroicon-m-cursor-arrow-rays',
                'color' => 'info',
            ],
        ];

        $loadsData = [
            [
                'name' => 'Failed Search Ad Loads',
                'ctr' => $views->search_views ? ($loads->failed_search_ad_loads / $views->search_views) * 100 : 0,
                'value' => $loads->failed_search_ad_loads ?? 0,
                'description' => 'Failed search ad loads',
                'description_icon' => 'heroicon-m-exclamation-triangle',
                'color' => 'danger',
            ],
            [
                'name' => 'Failed Article Ad Loads',
                'ctr' => $views->article_views ? ($loads->failed_article_ad_loads / $views->article_views) * 100 : 0,
                'value' => $loads->failed_article_ad_loads ?? 0,
                'description' => 'Failed article ad loads',
                'description_icon' => 'heroicon-m-exclamation-triangle',
                'color' => 'danger',
            ],
        ];

        return [
            TrackingAnalyticsStatsWidget::make(['data' => $viewsData]),
            TrackingAnalyticsStatsWidget::make(['data' => $clicksData]),
            TrackingAnalyticsStatsWidget::make(['data' => $loadsData]),
            KeywordTracking::make(['filters' => $this->filters]),
        ];
    }
}

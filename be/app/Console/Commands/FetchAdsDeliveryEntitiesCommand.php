<?php

namespace App\Console\Commands;

use App\Enums\AdsType;
use App\Jobs\FetchAccountAdsAndAdsetsJob;
use App\Models\Campaign;
use Carbon\Carbon;
use Exception;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class FetchAdsDeliveryEntitiesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:fetch-ads-adsets-by-facebook
                            {--date= : Date to check spending (YYYY-MM-DD), defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch adsets and ads from campaigns that have spending today';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();
        $yesterday = Carbon::yesterday();
        $dates = $this->option('date') ? [Carbon::parse($this->option('date'))] : [Carbon::today()];

        if ($now->copy()->subMinutes(30)->isSameDay($yesterday)) {
            $dates[] = $yesterday;
        }

        $dates = collect($dates)->unique(fn (Carbon $d) => $d->toDateString())->values()->all();

        try {
            foreach ($dates as $date) {
                $accountIds = $this->getAccountIds($date);

                if ($accountIds->isEmpty()) {
                    continue;
                }

                foreach ($accountIds as $accountId => $accountData) {
                    FetchAccountAdsAndAdsetsJob::dispatch(
                        (string) $accountId,
                        $accountData['campaign_ids'],
                        $date->format('Y-m-d'),
                    );
                }
            }

            return self::SUCCESS;
        } catch (Exception $e) {
            $this->error('Error: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Get account ids with spending.
     *
     * @return Collection<string|int, array{campaign_ids: list<string|int>}>
     */
    private function getAccountIds(Carbon $date): Collection
    {
        return Campaign::query()
            ->select('campaigns.account_id', 'campaigns.campaign_id')
            ->join('insight_reports', function ($join) {
                $join->on('campaigns.campaign_id', '=', 'insight_reports.campaign_id')
                    ->on('campaigns.account_id', '=', 'insight_reports.account_id');
            })
            ->whereDate('insight_reports.date_start', $date)
            ->where('insight_reports.spend', '>', 0)
            ->where('campaigns.ads_type', AdsType::FACEBOOK->value)
            ->distinct()
            ->get()
            ->groupBy('account_id')
            ->map(static fn (Collection $campaigns): array => [
                'campaign_ids' => $campaigns->pluck('campaign_id')->values()->all(),
            ]);
    }
}

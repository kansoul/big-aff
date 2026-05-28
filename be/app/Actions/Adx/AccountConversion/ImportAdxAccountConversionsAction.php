<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use Illuminate\Support\Facades\DB;

class ImportAdxAccountConversionsAction
{
    private const BATCH_SIZE = 500;

    /**
     * @var array<string, string>
     */
    private const CONVERSION_MAPPING = [
        'landingview' => 'landing_view',
        'landingviewu' => 'landing_view',
        'landing_view' => 'landing_view',
        'landing_views' => 'landing_view',
        'getgamelinkclick' => 'get_game_link_click',
        'getgamelinkclicku' => 'get_game_link_click',
        'get_game_link_click' => 'get_game_link_click',
        'get_game_link_clicks' => 'get_game_link_click',
        'detailview' => 'detail_view',
        'detailviewu' => 'detail_view',
        'detail_view' => 'detail_view',
        'detail_views' => 'detail_view',
        'getbonusclick' => 'get_bonus_click',
        'getbonusclicku' => 'get_bonus_click',
        'get_bonus_click' => 'get_bonus_click',
        'get_bonus_clicks' => 'get_bonus_click',
        'interclickad' => 'inter_click_ad',
        'interclickadu' => 'inter_click_ad',
        'inter_click_ad' => 'inter_click_ad',
        'rewardclickad' => 'reward_click_ad',
        'rewardclickadu' => 'reward_click_ad',
        'reward_click_ad' => 'reward_click_ad',
        'bannerclickad' => 'banner_click_ad',
        'bannerclickadu' => 'banner_click_ad',
        'banner_click_ad' => 'banner_click_ad',
    ];

    /**
     * @return array{processed: int, skipped: int}
     */
    public function execute(string $rawData): array
    {
        $lines = explode("\n", $rawData);
        $skipped = 0;
        $now = now();
        $rowsByKey = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $parts = array_map('trim', explode('|', $line));
            if ($this->isHeaderRow($parts)) {
                continue;
            }

            $source = 'google';
            if (count($parts) === 3) {
                [$accountId, $conversionName, $conversionActionId] = $parts;
            } elseif (count($parts) === 4) {
                [$source, $accountId, $conversionName, $conversionActionId] = $parts;
            } else {
                $skipped++;

                continue;
            }

            $conversionType = $this->conversionTypeFromName($conversionName);
            if ($source === '' || $accountId === '' || $conversionActionId === '' || $conversionType === null) {
                $skipped++;

                continue;
            }

            $rowsByKey[$this->rowKey($source, $accountId, $conversionType)] = [
                'source' => $source,
                'account_id' => $accountId,
                'conversion_type' => $conversionType,
                'conversion_action_id' => $conversionActionId,
                'name' => $conversionName,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if ($rowsByKey === []) {
            return ['processed' => 0, 'skipped' => $skipped];
        }

        $rows = $this->filterRowsWithAuthorizedAccounts(array_values($rowsByKey), $skipped);

        DB::transaction(function () use ($rows): void {
            foreach (array_chunk($rows, self::BATCH_SIZE) as $chunk) {
                AdxAccountConversion::query()->upsert(
                    $chunk,
                    uniqueBy: ['source', 'account_id', 'conversion_type'],
                    update: ['conversion_action_id', 'name', 'status', 'updated_at'],
                );
            }
        });

        $processed = count($rows);

        return ['processed' => $processed, 'skipped' => $skipped];
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function filterRowsWithAuthorizedAccounts(array $rows, int &$skipped): array
    {
        $accountKeys = [];
        foreach ($rows as $row) {
            $accountKeys[$this->accountKey($row['source'], $row['account_id'])] = [
                'source' => $row['source'],
                'account_id' => $row['account_id'],
            ];
        }

        $sources = array_values(array_unique(array_column($accountKeys, 'source')));
        $accountIds = array_values(array_unique(array_column($accountKeys, 'account_id')));

        $accounts = AdxAccount::query()
            ->whereIn('source', $sources)
            ->whereIn('account_id', $accountIds)
            ->get()
            ->filter(fn(AdxAccount $account): bool => isset($accountKeys[$this->accountKey($account->source, $account->account_id)]))
            ->keyBy(fn(AdxAccount $account): string => $this->accountKey($account->source, $account->account_id));

        $ownerResource = new AdxAccountOwnerResource;
        foreach ($accounts as $account) {
            $ownerResource->authorize($account);
        }

        return array_values(array_filter($rows, function (array $row) use ($accounts, &$skipped): bool {
            if ($accounts->has($this->accountKey($row['source'], $row['account_id']))) {
                return true;
            }

            $skipped++;

            return false;
        }));
    }

    /**
     * @param  array<int, string>  $parts
     */
    private function isHeaderRow(array $parts): bool
    {
        if ($parts === []) {
            return false;
        }

        $first = strtolower(str_replace([' ', '_', '-'], '', $parts[0]));

        return in_array($first, ['customerid', 'accountid', 'source'], true);
    }

    private function conversionTypeFromName(string $conversionName): ?string
    {
        $key = strtolower(str_replace([' ', '-'], '', trim($conversionName)));

        return self::CONVERSION_MAPPING[$key] ?? null;
    }

    private function accountKey(string $source, string $accountId): string
    {
        return $source . '|' . $accountId;
    }

    private function rowKey(string $source, string $accountId, string $conversionType): string
    {
        return $this->accountKey($source, $accountId) . '|' . $conversionType;
    }
}

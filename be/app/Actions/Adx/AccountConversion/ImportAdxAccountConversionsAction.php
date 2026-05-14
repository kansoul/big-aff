<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use Illuminate\Support\Facades\DB;

class ImportAdxAccountConversionsAction
{
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
    ];

    /**
     * @return array{processed: int, skipped: int}
     */
    public function execute(string $rawData): array
    {
        $lines = explode("\n", $rawData);
        $processed = 0;
        $skipped = 0;

        DB::transaction(function () use ($lines, &$processed, &$skipped): void {
            $ownerResource = new AdxAccountOwnerResource;

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

                $account = AdxAccount::query()
                    ->where('source', $source)
                    ->where('account_id', $accountId)
                    ->first();

                if (! $account) {
                    $skipped++;

                    continue;
                }

                $ownerResource->authorize($account);

                AdxAccountConversion::query()->updateOrCreate(
                    [
                        'source' => $source,
                        'account_id' => $accountId,
                        'conversion_type' => $conversionType,
                    ],
                    [
                        'conversion_action_id' => $conversionActionId,
                        'name' => $conversionName,
                        'status' => 'active',
                    ],
                );

                $processed++;
            }
        });

        return ['processed' => $processed, 'skipped' => $skipped];
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
}

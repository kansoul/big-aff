<?php

namespace App\Actions\Gtag;

use App\Models\Account;
use App\Support\Gtag\GtagResolver;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Support\Facades\DB;

class ImportGtagsAction
{
    private const CONVERSION_MAPPING = [
        'OutboundClickU' => 'search_click',
        'ArticleViewU' => 'article_view',
        'SearchViewU' => 'search_view',
        'RSUClickU' => 'rsu_click',
    ];

    public function __construct(
        private readonly GtagResolver $gtagResolver = new GtagResolver,
    ) {}

    public function execute(string $rawData): array
    {
        $lines = explode("\n", $rawData);
        $processed = 0;
        $skipped = 0;
        $touchedAccountIds = [];

        DB::transaction(function () use ($lines, &$processed, &$skipped, &$touchedAccountIds): void {
            $ownerResource = new AccountOwnerResource;

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) {
                    continue;
                }

                $parts = explode('|', $line);
                if (count($parts) !== 4) {
                    $skipped++;

                    continue;
                }

                [$customerId, $code, $convName, $convId] = $parts;
                $customerId = trim($customerId);
                $code = trim($code);
                $convName = trim($convName);
                $convId = trim($convId);

                if (! isset(self::CONVERSION_MAPPING[$convName])) {
                    $skipped++;

                    continue;
                }

                $field = self::CONVERSION_MAPPING[$convName];
                $account = Account::where('account_id', $customerId)->first();

                if (! $account) {
                    $skipped++;

                    continue;
                }

                $ownerResource->authorize($account);

                $account->gtag()->updateOrCreate(
                    ['account_id' => $account->account_id],
                    [
                        'code' => $code,
                        $field => $convId,
                    ]
                );
                $touchedAccountIds[] = $account->account_id;
                $processed++;
            }
        });

        foreach (array_unique($touchedAccountIds) as $accountId) {
            $this->gtagResolver->forget($accountId);
        }

        return ['processed' => $processed, 'skipped' => $skipped];
    }
}

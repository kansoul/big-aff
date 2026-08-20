<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Support\Facades\DB;

class ImportGoogleConversionsAction
{
    /**
     * @var array<string, string>
     */
    private const CONVERSION_MAPPING = [
        'page_view' => 'page_view',
        'redirect' => 'redirect',
        'submit_form' => 'submit_form',
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
            $ownerResource = new AccountOwnerResource;

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) {
                    continue;
                }

                $parts = explode('|', $line);
                if (count($parts) !== 3) {
                    $skipped++;

                    continue;
                }

                [$customerId, $convName, $convId] = $parts;
                $customerId = trim($customerId);
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

                $account->conversion()->updateOrCreate(
                    ['account_id' => $account->account_id],
                    [$field => $convId]
                );
                $processed++;
            }
        });

        return ['processed' => $processed, 'skipped' => $skipped];
    }
}

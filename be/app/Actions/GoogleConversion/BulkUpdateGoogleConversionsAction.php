<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Support\Facades\DB;

class BulkUpdateGoogleConversionsAction
{
    private const CONVERSION_FIELDS = [
        'article_view',
        'rsu_click',
        'search_view',
        'search_click',
    ];

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function execute(array $rows): void
    {
        DB::transaction(function () use ($rows): void {
            $ownerResource = new AccountOwnerResource;

            foreach ($rows as $row) {
                $account = Account::where('account_id', $row['account_id'])->first();
                if (! $account) {
                    continue;
                }

                $ownerResource->authorize($account);
                $values = $this->conversionValues($row);

                if ($values === []) {
                    continue;
                }

                $account->conversion()->updateOrCreate(
                    ['account_id' => $account->account_id],
                    $values
                );
            }
        });
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function conversionValues(array $row): array
    {
        $values = [];

        foreach (self::CONVERSION_FIELDS as $field) {
            if (array_key_exists($field, $row)) {
                $values[$field] = $row[$field];
            }
        }

        return $values;
    }
}

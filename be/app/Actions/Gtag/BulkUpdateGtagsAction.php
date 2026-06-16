<?php

namespace App\Actions\Gtag;

use App\Models\Account;
use App\Support\Gtag\GtagResolver;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Support\Facades\DB;

class BulkUpdateGtagsAction
{
    private const GTAG_FIELDS = [
        'code',
        'article_view',
        'rsu_click',
        'search_view',
        'search_click',
    ];

    public function __construct(
        private readonly GtagResolver $gtagResolver = new GtagResolver,
    ) {}

    public function execute(array $rows): void
    {
        $touchedAccountIds = DB::transaction(function () use ($rows): array {
            $ownerResource = new AccountOwnerResource;
            $touched = [];

            foreach ($rows as $row) {
                $account = Account::where('account_id', $row['account_id'])->first();
                if (! $account) {
                    continue;
                }

                $ownerResource->authorize($account);
                $values = $this->gtagValues($row);

                if ($values === []) {
                    continue;
                }

                $account->gtag()->updateOrCreate(
                    ['account_id' => $account->account_id],
                    $values
                );

                $touched[] = $account->account_id;
            }

            return $touched;
        });

        foreach (array_unique($touchedAccountIds) as $accountId) {
            $this->gtagResolver->forget($accountId);
        }
    }

    private function gtagValues(array $row): array
    {
        $values = [];

        foreach (self::GTAG_FIELDS as $field) {
            if (array_key_exists($field, $row)) {
                $values[$field] = $row[$field];
            }
        }

        return $values;
    }
}

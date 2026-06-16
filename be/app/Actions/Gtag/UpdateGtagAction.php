<?php

namespace App\Actions\Gtag;

use App\Models\Account;
use App\Support\Gtag\GtagResolver;
use App\Support\OwnerResource\AccountOwnerResource;

class UpdateGtagAction
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

    public function execute(Account $account, array $data): Account
    {
        (new AccountOwnerResource)->authorize($account);

        $values = $this->gtagValues($data);

        if ($values !== []) {
            $account->gtag()->updateOrCreate(
                ['account_id' => $account->account_id],
                $values
            );

            $this->gtagResolver->forget($account->account_id);
        }

        return $account->load('gtag');
    }

    private function gtagValues(array $data): array
    {
        $values = [];

        foreach (self::GTAG_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $values[$field] = $data[$field];
            }
        }

        return $values;
    }
}

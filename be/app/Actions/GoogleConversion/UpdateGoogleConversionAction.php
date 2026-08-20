<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;

class UpdateGoogleConversionAction
{
    private const CONVERSION_FIELDS = [
        'page_view',
        'redirect',
        'submit_form',
    ];

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Account $account, array $data): Account
    {
        (new AccountOwnerResource)->authorize($account);

        $values = $this->conversionValues($data);

        if ($values !== []) {
            $account->conversion()->updateOrCreate(
                ['account_id' => $account->account_id],
                $values
            );
        }

        return $account->load('conversion');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function conversionValues(array $data): array
    {
        $values = [];

        foreach (self::CONVERSION_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $values[$field] = $data[$field];
            }
        }

        return $values;
    }
}

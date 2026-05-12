<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountOwnerResource;

class UpsertAdxAccountConversionAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdxAccountConversion
    {
        $account = AdxAccount::query()
            ->where('source', $data['source'])
            ->where('account_id', $data['account_id'])
            ->first();
        if ($account) {
            (new AdxAccountOwnerResource)->authorize($account);
        }

        return AdxAccountConversion::query()->updateOrCreate(
            [
                'source' => $data['source'],
                'account_id' => $data['account_id'],
                'conversion_type' => $data['conversion_type'],
            ],
            [
                'conversion_action_id' => $data['conversion_action_id'],
                'name' => $data['name'] ?? null,
                'status' => $data['status'] ?? 'active',
            ],
        );
    }
}

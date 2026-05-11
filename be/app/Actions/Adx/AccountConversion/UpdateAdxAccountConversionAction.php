<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountOwnerResource;

class UpdateAdxAccountConversionAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdxAccountConversion $conversion, array $data): AdxAccountConversion
    {
        $account = AdxAccount::query()
            ->where('source', $conversion->source)
            ->where('account_id', $conversion->account_id)
            ->first();
        if ($account) {
            (new AdxAccountOwnerResource)->authorize($account);
        }

        $conversion->update($data);

        return $conversion->refresh();
    }
}

<?php

namespace App\Actions\Adx\AccountConversion;

use App\Models\AdxAccount;
use App\Models\AdxAccountConversion;
use App\Support\OwnerResource\AdxAccountOwnerResource;

class DeleteAdxAccountConversionAction
{
    public function execute(AdxAccountConversion $conversion): void
    {
        $account = AdxAccount::query()
            ->where('source', $conversion->source)
            ->where('account_id', $conversion->account_id)
            ->first();
        if ($account) {
            (new AdxAccountOwnerResource)->authorize($account);
        }

        $conversion->delete();
    }
}

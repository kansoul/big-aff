<?php

namespace App\Actions\Pixel;

use App\Models\Account;
use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;

class UpdatePixelAction
{
    public function execute(Pixel $pixel, array $data): Pixel
    {
        OwnershipFilter::forAuthUser()->authorizeAccount($pixel->account);
        $account = Account::query()->findOrFail($data['account_id']);
        OwnershipFilter::forAuthUser()->authorizeAccount($account);
        $pixel->update([...$data, 'updated_by' => auth()->id()]);

        return $pixel->fresh()->load('account');
    }
}

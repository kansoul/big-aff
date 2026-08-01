<?php

namespace App\Actions\Pixel;

use App\Models\Account;
use App\Models\Pixel;
use App\Support\OwnershipFilter\OwnershipFilter;

class CreatePixelAction
{
    public function execute(array $data): Pixel
    {
        $account = Account::query()->findOrFail($data['account_id']);
        OwnershipFilter::forAuthUser()->authorizeAccount($account);

        return Pixel::query()->create([...$data, 'created_by' => auth()->id(), 'updated_by' => auth()->id()])->load('account');
    }
}

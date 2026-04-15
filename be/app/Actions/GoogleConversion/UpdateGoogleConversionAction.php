<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;

class UpdateGoogleConversionAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Account $account, array $data): Account
    {
        OwnershipFilter::forAuthUser()->authorize($account->created_by);

        $account->conversion()->updateOrCreate(
            ['account_id' => $account->id],
            [
                'article_view' => $data['article_view'] ?? null,
                'rsu_click' => $data['rsu_click'] ?? null,
                'search_view' => $data['search_view'] ?? null,
                'search_click' => $data['search_click'] ?? null,
            ]
        );

        return $account->load('conversion');
    }
}

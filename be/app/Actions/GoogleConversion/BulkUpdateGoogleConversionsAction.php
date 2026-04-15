<?php

namespace App\Actions\GoogleConversion;

use App\Models\Account;
use Illuminate\Support\Facades\DB;

class BulkUpdateGoogleConversionsAction
{
    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function execute(array $rows): void
    {
        DB::transaction(function () use ($rows): void {
            foreach ($rows as $row) {
                $account = Account::find($row['account_id']);
                if (! $account) {
                    continue;
                }

                $account->conversion()->updateOrCreate(
                    ['account_id' => $account->id],
                    [
                        'article_view' => $row['article_view'] ?? null,
                        'rsu_click' => $row['rsu_click'] ?? null,
                        'search_view' => $row['search_view'] ?? null,
                        'search_click' => $row['search_click'] ?? null,
                    ]
                );
            }
        });
    }
}

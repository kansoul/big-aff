<?php

namespace App\Actions\Account;

use App\Models\Account;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkCreateAccountAction
{
    /**
     * Batch-create accounts from the validated request data.
     *
     * @param  array<string, mixed>  $data
     * @return array{created: list<Account>, errors: list<string>}
     */
    public function execute(array $data): array
    {
        $sharedFields = collect($data)->only([
            'ads_type',
            'business_center_id',
            'team_id',
            'status',
            'is_special',
            'sync_to_mcc',
        ])->toArray();

        $sharedFields['created_by'] = Auth::id();

        $created = [];
        $errors = [];

        $linesStr = $data['lines'] ?? '';
        $lines = array_filter(
            array_map('trim', explode("\n", $linesStr)),
            fn (string $line): bool => $line !== '',
        );

        $parsedAccounts = [];

        foreach ($lines as $index => $line) {
            $lineNumber = $index + 1;
            $parts = array_map('trim', explode('|', $line));

            $accountId = $parts[0] ?? '';
            $accountName = $parts[1] ?? null;

            if ($accountId === '') {
                $errors[] = "Line {$lineNumber}: Invalid format. Expected: account_id|account_name (account_name is optional)";

                continue;
            }

            $parsedAccounts[] = [
                'line_number' => $lineNumber,
                'account_id' => $accountId,
                'account_name' => $accountName === '' ? null : $accountName,
            ];
        }

        // Pre-fetch existing account IDs for optimization
        $requestedAccountIds = array_column($parsedAccounts, 'account_id');
        $existingAccountIds = [];
        if (! empty($requestedAccountIds)) {
            $existingAccountIds = Account::withTrashed()
                ->whereIn('account_id', $requestedAccountIds)
                ->pluck('account_id')
                ->toArray();
            $existingAccountIds = array_flip($existingAccountIds);
        }

        foreach ($parsedAccounts as $parsed) {
            $accountId = $parsed['account_id'];
            $lineNumber = $parsed['line_number'];

            if (isset($existingAccountIds[$accountId])) {
                $errors[] = "Line {$lineNumber}: Account ID '{$accountId}' already exists.";

                continue;
            }

            $accountData = [
                'account_id' => $accountId,
                'account_name' => $parsed['account_name'],
            ];

            $account = DB::transaction(function () use ($sharedFields, $accountData): Account {
                return Account::create(array_merge($sharedFields, $accountData));
            });

            $created[] = $account;
        }

        return ['created' => $created, 'errors' => $errors];
    }
}

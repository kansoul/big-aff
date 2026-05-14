<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkCreateAdxAccountsAction
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<AdxAccount>, errors: list<string>}
     */
    public function execute(array $data): array
    {
        $user = Auth::user();
        $userId = AccountsAccess::canViewUnscoped($user) ? null : $user?->id;
        $sharedFields = collect($data)->only([
            'source',
            'status',
            'is_special',
            'sync_to_mcc',
        ])->toArray();
        $sharedFields['created_by'] = Auth::id();

        $lines = array_filter(
            array_map('trim', explode("\n", $data['lines'] ?? '')),
            fn (string $line): bool => $line !== '',
        );

        $created = [];
        $errors = [];
        $parsedAccounts = [];

        foreach ($lines as $index => $line) {
            $lineNumber = $index + 1;
            $parts = array_map('trim', explode('|', $line));
            $accountId = $parts[0] ?? '';
            $accountName = $parts[1] ?? null;

            if ($accountId === '' || count($parts) > 2) {
                $errors[] = "Line {$lineNumber}: Invalid format. Expected: account_id|account_name";

                continue;
            }

            $parsedAccounts[] = [
                'line_number' => $lineNumber,
                'account_id' => $accountId,
                'account_name' => $accountName === '' ? null : $accountName,
            ];
        }

        $source = (string) $sharedFields['source'];
        $requestedAccountIds = array_column($parsedAccounts, 'account_id');
        $existingAccountIds = empty($requestedAccountIds)
            ? []
            : AdxAccount::withTrashed()
                ->where('source', $source)
                ->whereIn('account_id', $requestedAccountIds)
                ->pluck('account_id')
                ->flip()
                ->all();

        foreach ($parsedAccounts as $parsed) {
            $accountId = $parsed['account_id'];
            $lineNumber = $parsed['line_number'];

            if (isset($existingAccountIds[$accountId])) {
                $errors[] = "Line {$lineNumber}: Account ID '{$accountId}' already exists for source '{$source}'.";

                continue;
            }

            $account = DB::transaction(function () use ($sharedFields, $parsed, $userId): AdxAccount {
                $account = AdxAccount::query()->create([
                    ...$sharedFields,
                    'account_id' => $parsed['account_id'],
                    'account_name' => $parsed['account_name'],
                ]);

                if ($userId !== null) {
                    $account->users()->sync([$userId]);
                }

                return $account->load(['businessCenter', 'mainTeam', 'team', 'users']);
            });

            $existingAccountIds[$accountId] = true;
            $created[] = $account;
        }

        return ['created' => $created, 'errors' => $errors];
    }
}

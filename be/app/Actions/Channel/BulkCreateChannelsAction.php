<?php

namespace App\Actions\Channel;

use App\Models\Channel;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkCreateChannelsAction
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<Channel>, errors: list<string>}
     */
    public function execute(array $data): array
    {
        $lines = array_filter(
            array_map('trim', explode("\n", $data['lines'])),
            fn (string $line): bool => $line !== '',
        );

        $created = [];
        $errors = [];
        $userId = Auth::id();

        foreach ($lines as $index => $line) {
            $lineNumber = $index + 1;
            $parts = array_map('trim', explode('|', $line));

            if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
                $errors[] = "Line {$lineNumber}: Invalid format. Expected: channel_name|channel_code";

                continue;
            }

            [$name, $code] = $parts;

            if (Channel::withTrashed()->where('code', $code)->exists()) {
                $errors[] = "Line {$lineNumber}: Code '{$code}' already exists.";

                continue;
            }

            $channel = DB::transaction(function () use ($name, $code, $userId): Channel {
                return Channel::query()->create([
                    'name' => $name,
                    'code' => $code,
                    'is_active' => true,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
            });

            $created[] = $channel;
        }

        return ['created' => $created, 'errors' => $errors];
    }
}

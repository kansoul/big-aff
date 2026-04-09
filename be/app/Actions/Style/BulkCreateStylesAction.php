<?php

namespace App\Actions\Style;

use App\Models\Style;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkCreateStylesAction
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<Style>, errors: list<string>}
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
                $errors[] = "Line {$lineNumber}: Invalid format. Expected: name|code";

                continue;
            }

            [$name, $code] = $parts;

            if (Style::withTrashed()->where('code', $code)->exists()) {
                $errors[] = "Line {$lineNumber}: Code '{$code}' already exists.";

                continue;
            }

            $style = DB::transaction(function () use ($name, $code, $userId): Style {
                return Style::query()->create([
                    'name' => $name,
                    'code' => $code,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                ]);
            });

            $created[] = $style;
        }

        return ['created' => $created, 'errors' => $errors];
    }
}

<?php

namespace App\Actions\Lead;

use App\Models\Lead;

class StoreLeadAction
{
    /** @param array<string, mixed> $data */
    public function execute(string $sessionId, array $data): Lead
    {
        return Lead::query()->updateOrCreate(
            ['session_id' => $sessionId],
            $data,
        );
    }
}

<?php

namespace App\Actions\LoanApplication;

use App\Models\LoanApplication;
use Illuminate\Support\Str;

class CreateLoanApplicationAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): LoanApplication
    {
        $existing = $this->findResumable($data);

        if ($existing !== null) {
            $existing->update($data);

            return $existing->refresh();
        }

        return LoanApplication::create([
            ...$data,
            'public_id' => (string) Str::uuid(),
        ]);
    }

    /**
     * A visitor coming back through the same campaign with the same email is
     * continuing their application, not starting a new one. Finished ones are
     * left alone so a completed application is never reopened.
     *
     * @param  array<string, mixed>  $data
     */
    private function findResumable(array $data): ?LoanApplication
    {
        if (blank($data['email'] ?? null) || blank($data['campaign_id'] ?? null)) {
            return null;
        }

        return LoanApplication::query()
            ->where('email', $data['email'])
            ->where('campaign_id', $data['campaign_id'])
            ->whereNull('completed_at')
            ->latest('id')
            ->first();
    }
}

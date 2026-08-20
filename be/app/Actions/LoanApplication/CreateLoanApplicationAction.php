<?php

namespace App\Actions\LoanApplication;

use App\Models\LoanApplication;
use Illuminate\Database\Eloquent\Builder;
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
     * A visitor is continuing an unfinished application rather than starting a
     * new one when either the tracking session matches, or the same person
     * (email or phone) comes back through the same ad. Completed applications
     * are never reopened.
     *
     * @param  array<string, mixed>  $data
     */
    private function findResumable(array $data): ?LoanApplication
    {
        return $this->findBySession($data) ?? $this->findByIdentityAndAd($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function findBySession(array $data): ?LoanApplication
    {
        if (blank($data['session_id'] ?? null)) {
            return null;
        }

        return $this->openApplications()
            ->where('session_id', $data['session_id'])
            ->first();
    }

    /**
     * The session is gone after a while, so fall back to the person plus the ad
     * that brought them in: same email or phone, same campaign / adset / ad.
     *
     * @param  array<string, mixed>  $data
     */
    private function findByIdentityAndAd(array $data): ?LoanApplication
    {
        $identity = array_filter([
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
        ], fn ($value): bool => filled($value));

        if ($identity === [] || blank($data['campaign_id'] ?? null)) {
            return null;
        }

        $query = $this->openApplications()
            ->where('campaign_id', $data['campaign_id'])
            ->where(function ($q) use ($identity): void {
                foreach ($identity as $column => $value) {
                    $q->orWhere($column, $value);
                }
            });

        // Only narrow by the ad ids the visitor actually came back with.
        foreach (['adset_id', 'ad_id'] as $column) {
            if (filled($data[$column] ?? null)) {
                $query->where($column, $data[$column]);
            }
        }

        return $query->first();
    }

    /**
     * @return Builder<LoanApplication>
     */
    private function openApplications(): Builder
    {
        return LoanApplication::query()
            ->whereNull('completed_at')
            ->latest('id');
    }
}

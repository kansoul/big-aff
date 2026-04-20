<?php

namespace App\Observers;

use App\Models\CampaignRule;
use Illuminate\Support\Str;

class CampaignRuleObserver
{
    public function creating(CampaignRule $rule): void
    {
        if (empty($rule->code_rule)) {
            $rule->code_rule = $this->generateUniqueCodeRule();
        }
    }

    private function generateUniqueCodeRule(int $attempts = 0): string
    {
        $maxAttempts = 100;
        $attempts = 0;
        $prefix = 'rule_';

        do {
            $randomValue = $prefix.Str::upper(Str::random(10));
            $exists = CampaignRule::where('code_rule', $randomValue)->exists();
            $attempts++;
        } while ($exists && $attempts < $maxAttempts);

        if ($exists) {
            return $this->generateUniqueCodeRule();
        }

        return $randomValue;
    }
}

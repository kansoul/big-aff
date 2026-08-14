<?php

namespace App\Http\Resources;

use App\Models\LoanApplication;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanApplicationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $fields = LoanApplication::applicationFields();
        $filled = array_values(array_filter(
            $fields,
            fn (string $field): bool => filled($this->getAttribute($field)),
        ));

        return [
            'id' => $this->public_id,
            'completed_at' => $this->completed_at,
            'updated_at' => $this->updated_at,
            // Values let a returning applicant resume with their answers in
            // place; `filled` also covers the sensitive fields, so the wizard
            // still knows which step to drop them on.
            'values' => $this->savedValues($fields),
            'filled' => $filled,
        ];
    }

    /**
     * @param  list<string>  $fields
     * @return array<string, mixed>
     */
    private function savedValues(array $fields): array
    {
        $values = [];

        foreach ($fields as $field) {
            if (in_array($field, LoanApplication::SENSITIVE_FIELDS, true)) {
                continue;
            }
            $value = $this->getAttribute($field);
            if (filled($value)) {
                $values[$field] = $value;
            }
        }

        return $values;
    }
}

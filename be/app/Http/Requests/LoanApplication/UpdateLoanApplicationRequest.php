<?php

namespace App\Http\Requests\LoanApplication;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The canonical rule set for the applicant answers. No endpoint of its own — the
 * answers arrive through the tracking log, which borrows these rules.
 */
class UpdateLoanApplicationRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public static function fieldRules(): array
    {
        return [
            'loan_amount' => ['sometimes', 'integer', Rule::in(range(1, 4))],
            'loan_purpose' => ['sometimes', 'integer', Rule::in(range(1, 9))],
            'email' => ['sometimes', 'email', 'max:255'],
            // Same shape the wizard enforces: 10 digits, area code not 0.
            'phone' => ['sometimes', 'regex:/^[1-9]\d{9}$/'],
            'best_call_time' => ['sometimes', 'integer', Rule::in(range(1, 4))],
            'consent_marketing' => ['sometimes', 'boolean'],
            'first_name' => ['sometimes', 'string', 'min:2', 'max:50'],
            'last_name' => ['sometimes', 'string', 'min:2', 'max:50'],
            'date_of_birth' => [
                'sometimes', 'date_format:Y-m-d',
                'before_or_equal:-18 years', 'after_or_equal:-80 years',
            ],
            'zip_code' => ['sometimes', 'regex:/^\d{5}$/'],
            'street_address' => ['sometimes', 'string', 'min:5', 'max:120'],
            'city' => ['sometimes', 'string', 'max:100'],
            'state' => ['sometimes', 'string', 'size:2', 'regex:/^[A-Za-z]{2}$/'],
            'residence_length' => ['sometimes', 'integer', Rule::in(range(1, 10))],
            'residence_status' => ['sometimes', 'integer', Rule::in(range(1, 2))],
            'income_source' => ['sometimes', 'integer', Rule::in(range(1, 4))],
            'employed_time' => ['sometimes', 'integer', Rule::in(range(1, 5))],
            'gross_income' => ['sometimes', 'integer', Rule::in(range(1, 8))],
            'next_pay_date' => [
                'sometimes', 'date_format:Y-m-d',
                'after:today', 'before_or_equal:+1 month',
                self::weekdayRule(),
            ],
            'debt_amount' => ['sometimes', 'integer', Rule::in(range(1, 7))],
            'employer_name' => ['sometimes', 'string', 'min:2', 'max:100'],
            'job_title' => ['sometimes', 'string', 'min:2', 'max:100'],
            'work_phone' => ['sometimes', 'regex:/^[1-9]\d{9}$/'],
            'pay_frequency' => ['sometimes', 'integer', Rule::in(range(1, 4))],
            'pay_method' => ['sometimes', 'integer', Rule::in(range(1, 2))],
            'routing_number' => ['sometimes', 'regex:/^\d{9}$/', self::abaChecksumRule()],
            'bank_name' => ['sometimes', 'string', 'max:120'],
            'account_type' => ['sometimes', 'integer', Rule::in(range(1, 2))],
            'account_length' => ['sometimes', 'integer', Rule::in(range(1, 6))],
            'account_number' => ['sometimes', 'regex:/^\d{4,30}$/'],
            'license_number' => ['sometimes', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z0-9 -]+$/'],
            'issuing_state' => ['sometimes', 'integer', Rule::in(range(1, 50))],
            'credit_score' => ['sometimes', 'integer', Rule::in(range(1, 5))],
            'ssn' => ['sometimes', 'regex:/^\d{9}$/'],
            // Affiliate click id arrives with the last step, before submit.
            'aff_click_id' => ['sometimes', 'nullable', 'string', 'max:128'],
            'completed' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * The wizard only offers weekdays; a weekend pay date means the payload did
     * not come from the form.
     */
    private static function weekdayRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || ! CarbonImmutable::hasFormat($value, 'Y-m-d')) {
                return;
            }
            if (CarbonImmutable::createFromFormat('Y-m-d', $value)->isWeekend()) {
                $fail('The :attribute must be a weekday.');
            }
        };
    }

    /** Routing numbers must satisfy the ABA check digit, as the wizard does. */
    private static function abaChecksumRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $digits = array_map('intval', str_split((string) $value));
            if (count($digits) !== 9) {
                return;
            }
            $checksum = 3 * ($digits[0] + $digits[3] + $digits[6])
                + 7 * ($digits[1] + $digits[4] + $digits[7])
                + ($digits[2] + $digits[5] + $digits[8]);
            if ($checksum % 10 !== 0) {
                $fail('The :attribute is not a valid routing number.');
            }
        };
    }
}

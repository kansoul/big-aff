<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoanApplication extends Model
{
    use HasFactory;

    /** Encrypted at rest and never echoed back to the browser. */
    public const SENSITIVE_FIELDS = [
        'routing_number', 'account_number', 'license_number', 'ssn',
    ];

    /** Attribution/bookkeeping columns, not applicant answers. */
    public const NON_APPLICATION_FIELDS = [
        'public_id', 'session_id', 'campaign_id', 'adset_id', 'ad_id', 'utm_source',
        'aff_click_id', 'completed_at',
    ];

    protected $fillable = [
        'public_id', 'session_id', 'campaign_id', 'adset_id', 'ad_id', 'utm_source', 'aff_click_id', 'loan_amount',
        'loan_purpose', 'email', 'phone', 'best_call_time', 'consent_marketing',
        'first_name', 'last_name', 'date_of_birth', 'zip_code', 'street_address',
        'city', 'state', 'residence_length', 'residence_status', 'income_source', 'employed_time',
        'gross_income', 'next_pay_date', 'debt_amount', 'employer_name', 'job_title',
        'work_phone', 'pay_frequency', 'pay_method', 'routing_number', 'bank_name', 'account_type',
        'account_length', 'account_number', 'license_number', 'issuing_state',
        'credit_score', 'ssn', 'completed_at',
    ];

    /**
     * The applicant-supplied fields, i.e. everything the wizard collects.
     *
     * @return list<string>
     */
    public static function applicationFields(): array
    {
        return array_values(array_diff(
            (new self)->getFillable(),
            self::NON_APPLICATION_FIELDS,
        ));
    }

    protected function casts(): array
    {
        return [
            'consent_marketing' => 'boolean',
            'date_of_birth' => 'date:Y-m-d',
            'next_pay_date' => 'date:Y-m-d',
            'account_number' => 'encrypted',
            'license_number' => 'encrypted',
            'routing_number' => 'encrypted',
            'ssn' => 'encrypted',
            'completed_at' => 'datetime',
        ];
    }
}

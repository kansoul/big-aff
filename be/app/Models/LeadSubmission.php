<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadSubmission extends Model
{
    use HasFactory;

    protected $table = 'lead_submissions';

    protected $fillable = [
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'page',
        'amount',
        'email',
        'phone',
        'best_call_time',
        'first_name',
        'last_name',
        'dob',
        'zip',
        'street',
        'residence_length',
        'residence_status',
        'income_source',
        'employed_time',
        'gross_income',
        'next_pay_date',
        'debt',
        'employer',
        'job_title',
        'work_phone',
        'pay_frequency',
        'pay_method',
        'routing_number',
        'account_type',
        'account_length',
        'account_number',
        'license_number',
        'issuing_state',
        'credit_score',
        'ssn',
        'extra',
        'event_time',
    ];

    /**
     * The wizard sends camelCase field names; this maps them onto columns.
     * Anything not listed here lands in `extra`.
     *
     * @var array<string, string>
     */
    public const FIELD_MAP = [
        'amount' => 'amount',
        'email' => 'email',
        'phone' => 'phone',
        'bestCallTime' => 'best_call_time',
        'firstName' => 'first_name',
        'lastName' => 'last_name',
        'dob' => 'dob',
        'zip' => 'zip',
        'street' => 'street',
        'residenceLength' => 'residence_length',
        'residenceStatus' => 'residence_status',
        'incomeSource' => 'income_source',
        'employedTime' => 'employed_time',
        'grossIncome' => 'gross_income',
        'nextPayDate' => 'next_pay_date',
        'debt' => 'debt',
        'employer' => 'employer',
        'jobTitle' => 'job_title',
        'workPhone' => 'work_phone',
        'payFrequency' => 'pay_frequency',
        'payMethod' => 'pay_method',
        'routing' => 'routing_number',
        'accountType' => 'account_type',
        'accountLength' => 'account_length',
        'accountNumber' => 'account_number',
        'license' => 'license_number',
        'issuingState' => 'issuing_state',
        'creditScore' => 'credit_score',
        'ssn' => 'ssn',
    ];

    protected function casts(): array
    {
        return [
            'extra' => 'array',
            'event_time' => 'datetime',
            // Sensitive identifiers are never stored in plain text.
            'account_number' => 'encrypted',
            'ssn' => 'encrypted',
        ];
    }

    public function trackingSession(): BelongsTo
    {
        return $this->belongsTo(TrackingSession::class, 'session_id', 'session_id');
    }
}

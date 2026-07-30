<?php

namespace App\Support\AdsDelivery;

/**
 * Effective / delivery status labels aligned with Filament AllReport adsets & ads tables.
 *
 * @phpstan-type StatusOption array{value: string, label: string}
 */
final class DeliveryEntityStatusDictionary
{
    /**
     * provider-style delivery statuses (value => label).
     */
    public const OPTIONS = [
        'ACTIVE' => 'Active',
        'PAUSED' => 'Paused',
        'PENDING_REVIEW' => 'Pending Review',
        'DISAPPROVED' => 'Disapproved',
        'PREAPPROVED' => 'Preapproved',
        'PENDING_BILLING_INFO' => 'Pending Billing Info',
        'CAMPAIGN_PAUSED' => 'Campaign Paused',
        'ARCHIVED' => 'Archived',
        'ADSET_PAUSED' => 'Adset Paused',
        'IN_PROCESS' => 'In Process',
        'WITH_ISSUES' => 'With Issues',
    ];

    /**
     * @return list<StatusOption>
     */
    public static function toSelectOptions(): array
    {
        $out = [];
        foreach (self::OPTIONS as $value => $label) {
            $out[] = ['value' => $value, 'label' => $label];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_keys(self::OPTIONS);
    }
}
